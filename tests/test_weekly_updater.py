import importlib.util
import unittest
from pathlib import Path

MOD = Path(__file__).resolve().parents[1] / "scripts" / "update-official-restaurants.py"
spec = importlib.util.spec_from_file_location("weekly", MOD)
weekly = importlib.util.module_from_spec(spec)
spec.loader.exec_module(weekly)

def record(identifier, name, town="羅東鎮", street="中正路1號", city="宜蘭縣", status=""):
    return {"RestaurantID":identifier,"RestaurantName":name,
            "PostalAddress":{"City":city,"Town":town,"StreetAddress":street},
            "ServiceStatus":status}

class WeeklyUpdaterTests(unittest.TestCase):
    def test_extract_nested_official_format(self):
        obj={"RestaurantList":{"Restaurants":{"Restaurant":[record("1","羅東小店"),record("2","五結小店")]}}}
        self.assertEqual(len(weekly._unpack_records(obj)),2)

    def test_only_whitelisted_yilan_towns(self):
        self.assertIsNotNone(weekly.parse_restaurant(record("1","好味道"),"2026-10-20"))
        self.assertIsNone(weekly.parse_restaurant(record("2","好味道",city="臺北市"),"2026-10-20"))
        self.assertIsNone(weekly.parse_restaurant(record("3","好味道",town="礁溪鄉"),"2026-10-20"))
        self.assertIsNone(weekly.parse_restaurant(record("4","好味道",street=""),"2026-10-20"))
        self.assertIsNone(weekly.parse_restaurant(record("5","好味道",status="已歇業"),"2026-10-20"))

    def test_no_fake_prices_or_open_status(self):
        item=weekly.parse_restaurant(record("test1","阿春咖啡",town="冬山鄉"),"2026-10-20")
        self.assertEqual(item["c"],"咖啡甜點")
        self.assertEqual(item["m"],"")
        self.assertEqual(item["b"],0)
        self.assertEqual(item["a"],"冬山")
        self.assertTrue(item["sourceUrl"].startswith("https://"))

    def test_review_possible_relocation_and_never_auto_delete(self):
        old=weekly.parse_restaurant(record("keep1","阿霞牛肉麵",street="站前路1號"),"2026-10-01")
        changed=record("keep1","阿霞牛肉麵",street="站前路2號")
        out,meta=weekly.reconcile([changed],[],[old],"2026-10-20")
        self.assertEqual(out[0]["addr"],old["addr"])
        self.assertEqual(meta["new"],0)
        self.assertGreaterEqual(meta["reviewRequired"],1)

    def test_no_duplicate_curated_and_stable_ids(self):
        input_records=[record("aa","先前就有","五結鄉"),record("bb","新店","蘇澳鎮")]
        curated=[{"id":"ld1","n":"先前就有","addr":"宜蘭縣五結鄉中正路1號"}]
        new,meta=weekly.reconcile(input_records,curated,[],"2026-10-20")
        self.assertEqual(meta["new"],1)
        self.assertEqual(new[0]["n"],"新店")
        self.assertTrue(new[0]["id"].startswith("gov"))
        again,meta2=weekly.reconcile(input_records,curated,new,"2026-10-27")
        self.assertEqual(again,new)
        self.assertEqual(meta2["new"],0)

    def test_max_new_is_respected(self):
        feed=[record(str(i),"新開店"+str(i)) for i in range(11)]
        shops,meta=weekly.reconcile(feed,[],[],"2026-10-20",max_new=3)
        self.assertEqual(len(shops),3)
        self.assertEqual(meta["remainingCandidates"],8)

if __name__ == "__main__":
    unittest.main()
