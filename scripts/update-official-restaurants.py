#!/usr/bin/env python3
"""每週匯入觀光署餐飲開放資料，保留既有店家，從不依資料集缺席自動刪店。"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import re
import subprocess
import sys
import unicodedata
import urllib.request
import urllib.parse
import zipfile
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
SOURCE_URL = "https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Restaurant-json.zip"
SOURCE_PAGE = "https://data.gov.tw/dataset/7779"
SOURCE_LABEL = "交通部觀光署餐飲開放資料"
AREAS = {
    "羅東鎮": "羅東市區", "五結鄉": "五結", "冬山鄉": "冬山",
    "三星鄉": "三星", "蘇澳鎮": "蘇澳",
}
MAX_NEW_PER_RUN = 80
MAX_COMPRESSED_BYTES = 60_000_000
MAX_UNCOMPRESSED_BYTES = 160_000_000
OSM_COPYRIGHT = "https://www.openstreetmap.org/copyright"
OVERPASS_ENDPOINTS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
)
OSM_POSTCODES = {"265":"羅東鎮","268":"五結鄉","269":"冬山鄉","266":"三星鄉","270":"蘇澳鎮"}


def norm(value: object) -> str:
    """保守去重：只忽略排版差異，避免把不同分店硬湊成同家。"""
    return re.sub(r"[\s　()（）\-_．·.]", "", unicodedata.normalize("NFKC", str(value or "")).lower()).replace("臺", "台")

def _pick(obj: dict, *keys: str) -> str:
    for key in keys:
        value = obj.get(key)
        if value is not None and not isinstance(value, (list, dict)):
            return str(value).strip()
    return ""

def _unpack_records(tree: object) -> list[dict]:
    """容許政府 JSON 有 RestaurantList/Restaurants/Restaurant 等多種包裝。"""
    records = []
    stack = [tree]
    while stack:
        obj = stack.pop()
        if isinstance(obj, list):
            stack.extend(obj)
        elif isinstance(obj, dict):
            if "RestaurantID" in obj and "RestaurantName" in obj:
                records.append(obj)
            else:
                for value in obj.values():
                    if isinstance(value, (list, dict)):
                        stack.append(value)
    return records

def fetch_records(url: str = SOURCE_URL, fixture: str | None = None) -> list[dict]:
    if fixture:
        payload = Path(fixture).read_bytes()
        if fixture.lower().endswith(".zip"):
            data = payload
        else:
            return _unpack_records(json.loads(payload.decode("utf-8-sig")))
    else:
        request = urllib.request.Request(url, headers={
            "User-Agent": "LuodongEats-WeeklyMaintainer/1.0 (public community guide)",
            "Accept": "application/zip,application/octet-stream",
        })
        with urllib.request.urlopen(request, timeout=80) as response:
            chunks = []
            total = 0
            while True:
                block = response.read(1024 * 1024)
                if not block:
                    break
                total += len(block)
                if total > MAX_COMPRESSED_BYTES:
                    raise RuntimeError("官方資料壓縮檔超出安全容量，停止更新")
                chunks.append(block)
            data = b"".join(chunks)
    if len(data) > MAX_COMPRESSED_BYTES:
        raise RuntimeError("下載資料量超出限制")
    results = []
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        # 有些來源會回傳解壓後的 JSON；若為 HTML/封鎖頁，記錄辨識資訊方便排查。
        try:
            parsed=json.loads(data.decode("utf-8-sig"))
            recovered=_unpack_records(parsed)
            if recovered:
                return recovered
        except (UnicodeDecodeError, json.JSONDecodeError):
            pass
        snippet=data[:140].decode("utf-8",errors="replace")
        raise RuntimeError(f"官方資料不是 ZIP/JSON；前140字元={snippet!r}，大小={len(data)}") from exc
    with archive:
        members = [x for x in archive.infolist() if x.filename.lower().endswith(".json") and not x.is_dir()]
        if not members:
            raise RuntimeError("官方 ZIP 找不到 JSON 店家資料")
        if sum(x.file_size for x in members) > MAX_UNCOMPRESSED_BYTES:
            raise RuntimeError("官方資料解壓縮容量超出限制")
        for member in members:
            obj = json.loads(archive.read(member).decode("utf-8-sig"))
            results.extend(_unpack_records(obj))
    if not results:
        raise RuntimeError("官方資料缺少 RestaurantID / RestaurantName，格式可能變更")
    return results

def fetch_osm_records() -> list[dict]:
    """政府網域阻擋 CI 時，從 OpenStreetMap 取已有名稱與地址的 POI，不臆測行政區。"""
    query = (
        '[out:json][timeout:50];('
        'nwr["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](24.52,121.59,24.78,121.94);'
        'nwr["shop"~"^(bakery|pastry)$"](24.52,121.59,24.78,121.94);'
        ');out center tags;'
    )
    failures=[]
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            data=urllib.parse.urlencode({"data":query}).encode("utf-8")
            req=urllib.request.Request(endpoint,data=data,headers={
                "User-Agent":"LuodongEats/1.0 (noncommercial restaurant listing)",
                "Content-Type":"application/x-www-form-urlencoded",
                "Accept":"application/json",
            },method="POST")
            with urllib.request.urlopen(req,timeout=80) as response:
                body=response.read(16_000_000)
            parsed=json.loads(body.decode("utf-8-sig"))
            entries=parsed.get("elements",[])
            if not isinstance(entries,list) or len(entries)<5:
                raise RuntimeError("OpenStreetMap 回應太少或資料格式異常")
            result=[]
            for poi in entries:
                tags=poi.get("tags") or {}
                name=str(tags.get("name:zh") or tags.get("name") or "").strip()
                if len(name)<2 or len(name)>80:
                    continue
                addr_city=str(tags.get("addr:city") or tags.get("addr:county") or "")
                if addr_city and norm(addr_city)!="宜蘭縣":
                    continue
                combined=" ".join(str(tags.get(k,"")) for k in
                    ("addr:district","addr:subdistrict","addr:town","addr:city","addr:full"))
                town=next((t for t in AREAS if t in combined),None)
                postcode=str(tags.get("addr:postcode") or "").strip()
                if town is None:
                    town=OSM_POSTCODES.get(postcode)
                if town is None:
                    continue
                street=str(tags.get("addr:street") or "").strip()
                house=str(tags.get("addr:housenumber") or "").strip()
                full=str(tags.get("addr:full") or "").strip()
                if street:
                    street=street+(house if house and house not in street else "")
                elif full:
                    street=full.replace("宜蘭縣","").replace(town,"").strip()
                if not street:
                    continue
                if not any(k in street for k in ("路","街","巷","弄","村","號")):
                    continue
                osm_type=poi.get("type","node")
                osm_id=poi.get("id")
                if osm_type not in ("node","way","relation") or not isinstance(osm_id,int):
                    continue
                link=f"https://www.openstreetmap.org/{osm_type}/{osm_id}"
                result.append({
                    "RestaurantID":f"osm:{osm_type}:{osm_id}",
                    "RestaurantName":name,
                    "PostalAddress":{"City":"宜蘭縣","Town":town,"StreetAddress":street},
                    "SourceURL":link,
                })
            if not result:
                raise RuntimeError("OpenStreetMap 尚無具完整地址的在地店家")
            print(f"官方來源不可用，備援 Overpass 回傳 {len(entries)} 個 POI，有效具地址店家 {len(result)} 家")
            return result
        except Exception as exc:
            failures.append(endpoint+": "+str(exc)[:120])
            print("OpenStreetMap 備援失敗:",failures[-1],file=sys.stderr)
    raise RuntimeError("所有公開資料來源都失敗；未改動網站。"+ "; ".join(failures))

def classify(name: str) -> tuple[str, str, str]:
    if any(word in name for word in ("咖啡", "豆花", "甜點", "蛋糕", "冰店", "烘焙", "手搖", "茶飲", "甜品")):
        return "咖啡甜點", "☕", "green"
    if any(word in name for word in ("壽司", "拉麵", "義式", "日式", "越式", "韓式", "披薩", "泰式")):
        return "異國", "🍜", "blue"
    if any(word in name for word in ("餐廳", "飯店", "火鍋", "鐵板燒", "牛排", "海鮮", "食堂", "合菜")):
        return "正餐", "🍚", "orange"
    return "小吃", "🥟", "yellow"

def parse_restaurant(record: dict, checked_at: str) -> dict | None:
    rid = _pick(record, "RestaurantID")
    name = _pick(record, "RestaurantName")
    post = record.get("PostalAddress") or {}
    if not isinstance(post, dict):
        return None
    city = norm(_pick(post, "City"))
    town = norm(_pick(post, "Town"))
    street = _pick(post, "StreetAddress")
    if city != "宜蘭縣" or town not in AREAS:
        return None
    if not rid or len(name) < 2 or not street or len(street) > 150 or len(name) > 80:
        return None
    service = record.get("ServiceStatus") or ""
    if isinstance(service, dict):
        service = json.dumps(service, ensure_ascii=False)
    if any(bad in str(service) for bad in ("歇業", "停業", "永久關閉", "結束營業", "已關閉")):
        return None
    # 禁止把開放資料本身當作即時營業狀態或現行價目表。
    area = AREAS[town]
    if town == "蘇澳鎮" and any(term in (street + name) for term in ("南方澳", "南寧", "漁港", "江夏", "海邊路", "內埤")):
        area = "南方澳"
    category, emoji, tone = classify(name)
    address = "宜蘭縣" + town + street
    osm_record=rid.startswith("osm:")
    return {
        "id": ("osm" if osm_record else "gov") + hashlib.sha256(rid.encode("utf-8")).hexdigest()[:14],
        "n": name, "a": area, "c": category, "m": "", "b": 0,
        "s": ("OpenStreetMap 社群地圖收錄，出發前請確認實際營業資訊。" if osm_record else "觀光署資料庫收錄，出發前請確認實際營業資訊。"),
        "addr": address, "e": emoji, "t": tone,
        "sourceUrl": _pick(record,"SourceURL") if osm_record else SOURCE_PAGE,
        "sourceLabel": "© OpenStreetMap contributors（ODbL）" if osm_record else SOURCE_LABEL,
        "sourceCheckedAt": checked_at,
        "externalID": rid,
    }

def read_curated() -> list[dict]:
    js = r"""
const vm = require("node:vm"), fs = require("node:fs");
const ctx = {window:{}};
for(const path of ["data.js","data-extra.js"]) {
  vm.runInNewContext(fs.readFileSync(path,"utf8"),ctx,{filename:path,timeout:10000});
}
console.log(JSON.stringify(ctx.window.LUODONG_RESTAURANTS || []));
"""
    proc = subprocess.run(["node", "-e", js], cwd=ROOT, text=True, capture_output=True, check=True)
    return json.loads(proc.stdout)

def read_auto(path: Path) -> tuple[list[dict], str, str]:
    content = path.read_text(encoding="utf-8")
    marker = re.search(r"(window\.LUODONG_OFFICIAL_DATA\s*=\s*)(\[.*?\])(\s*;\s*\(function)",content,re.S)
    if not marker:
        raise RuntimeError("data-auto.js 內容格式異常，不能安全更新")
    return json.loads(marker.group(2)), content[:marker.start(2)], content[marker.end(2):]

def reconcile(records: list[dict], curated: list[dict], previous: list[dict], checked_at: str, max_new=MAX_NEW_PER_RUN):
    old_by_id = {item["id"]: item for item in previous}
    name_index = {norm(item["n"]): item for item in [*curated,*previous]}
    address_index = {(norm(item["n"]),norm(item.get("addr",""))) for item in [*curated,*previous]}
    ids_from_feed = set()
    incoming = {}
    review = []
    candidates = []
    for raw in records:
        item = parse_restaurant(raw,checked_at)
        if item is None:
            continue
        ids_from_feed.add(item["id"])
        incoming[item["id"]] = item
    if not incoming:
        raise RuntimeError("官方名單沒有任何羅東周邊有效店家，保留既有資料")
    for identifier, item in sorted(incoming.items()):
        previous_item = old_by_id.get(identifier)
        if previous_item is not None:
            if norm(previous_item["n"]) != norm(item["n"]) or norm(previous_item.get("addr","")) != norm(item["addr"]):
                review.append({"type":"官方資料變動待確認","id":identifier,
                    "oldName":previous_item["n"],"newName":item["n"],
                    "oldAddress":previous_item.get("addr",""),"newAddress":item["addr"]})
            # 改名、搬遷先人工複核，避免覆寫既有收藏店家。
            continue
        same_name = name_index.get(norm(item["n"]))
        if same_name is not None:
            if norm(same_name.get("addr","")) != norm(item["addr"]):
                review.append({"type":"同名不同址待確認","name":item["n"],
                    "currentAddress":same_name.get("addr",""),"sourceAddress":item["addr"]})
            continue
        if (norm(item["n"]),norm(item["addr"])) in address_index:
            continue
        candidates.append(item)
        name_index[norm(item["n"])] = item
    additions = candidates[:max_new]
    updated = [*previous,*additions]
    missing = [item for item in previous if item["id"] not in ids_from_feed]
    for item in missing[:100]:
        review.append({"type":"官方名錄未再出現（不代表歇業）","name":item["n"],"id":item["id"]})
    updated.sort(key=lambda row: row["id"])
    return updated, {
        "sourceLocalCount":len(incoming),"new":len(additions),
        "remainingCandidates":max(0,len(candidates)-len(additions)),
        "previousOfficialCount":len(previous),"totalOfficialCount":len(updated),
        "reviewRequired":len(review),"missingFromFeed":len(missing),
        "curatedCount":len(curated),
        "reviewItems":review[:200],
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", help="本機測試檔 JSON 或 ZIP；正式排程不使用")
    parser.add_argument("--dry-run",action="store_true")
    parser.add_argument("--max-new",type=int,default=MAX_NEW_PER_RUN)
    args = parser.parse_args()
    if args.max_new < 0 or args.max_new > 200:
        parser.error("max-new 必須在 0..200")
    checked_at = datetime.now(ZoneInfo("Asia/Taipei")).strftime("%Y-%m-%d")
    path = ROOT/"data-auto.js"
    old, head, tail = read_auto(path)
    curated = read_curated()
    source_name=SOURCE_LABEL
    source_link=SOURCE_PAGE
    try:
        records=fetch_records(fixture=args.fixture)
    except Exception as exc:
        if args.fixture:
            raise
        print("交通部觀光署來源暫不可用，改查 OpenStreetMap："+str(exc),file=sys.stderr)
        records=fetch_osm_records()
        source_name="OpenStreetMap contributors（ODbL）"
        source_link=OSM_COPYRIGHT
    updated, report = reconcile(records,curated,old,checked_at,args.max_new)
    report.update({"checkedAt":checked_at,"source":source_link,"sourceName":source_name,"sourceDownload":SOURCE_URL if source_name==SOURCE_LABEL else "Overpass API",
                   "feedRecordCount":len(records),"mode":"dry-run" if args.dry_run else "scheduled"})
    print(json.dumps({key:value for key,value in report.items() if key!="reviewItems"},ensure_ascii=False,indent=2))
    if args.dry_run:
        return 0
    # 不隨每週更新 sourceCheckedAt：只有新收錄店家才標記當日，避免無意義大量差異。
    tail_new, stamp_count = re.subn(
        r'(window\.LUODONG_LAST_OFFICIAL_CHECK\s*=\s*)"[^"]*"',
        lambda m: m.group(1) + json.dumps(checked_at,ensure_ascii=False),tail,count=1
    )
    if stamp_count != 1:
        raise RuntimeError("缺少官方資料最後檢查日期標記，停止寫入")
    if updated != old or tail_new != tail:
        payload=json.dumps(updated,ensure_ascii=False,indent=2)
        path.write_text(head+payload+tail_new,encoding="utf-8")
    report_dir=ROOT/"data"
    report_dir.mkdir(exist_ok=True)
    (report_dir/"update-status.json").write_text(
        json.dumps({k:v for k,v in report.items() if k!="reviewItems"},ensure_ascii=False,indent=2)+"\n",encoding="utf-8"
    )
    (report_dir/"update-review.json").write_text(
        json.dumps({"checkedAt":checked_at,"items":report["reviewItems"],
                    "reviewRequired":report["reviewRequired"]},ensure_ascii=False,indent=2)+"\n",encoding="utf-8"
    )
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("商家同步失敗（保留原資料）:",str(exc),file=sys.stderr)
        sys.exit(1)
