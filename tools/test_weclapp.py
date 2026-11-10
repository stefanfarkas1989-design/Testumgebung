import os, sys, unittest
sys.path.insert(0, os.path.dirname(__file__))
import weclapp


class RedactTest(unittest.TestCase):
    def test_pii_masked_safe_kept(self):
        d = {"id": "1", "company": "ACME", "email": "a@b.de", "street1": "X",
             "nested": [{"phoneNumber": "123", "customerNumber": "K1"}], "note": None}
        r = weclapp.redact(d)
        self.assertEqual(r["id"], "1")
        self.assertEqual(r["company"], "ACME")
        self.assertTrue(r["email"].startswith("<redacted:"))
        self.assertTrue(r["street1"].startswith("<redacted:"))
        self.assertTrue(r["nested"][0]["phoneNumber"].startswith("<redacted:"))
        self.assertEqual(r["nested"][0]["customerNumber"], "K1")
        self.assertIsNone(r["note"])

    def test_stable_pseudonym(self):
        self.assertEqual(weclapp.pseudonym("x"), weclapp.pseudonym("x"))


if __name__ == "__main__":
    unittest.main()
