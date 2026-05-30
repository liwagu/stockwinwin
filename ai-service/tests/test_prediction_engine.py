import importlib
import sys
import unittest


def _reload_module():
    sys.modules.pop("prediction_engine", None)
    return importlib.import_module("prediction_engine")


class PredictionEngineTests(unittest.TestCase):
    def test_generate_prediction_rejects_invalid_horizon(self):
        module = _reload_module()
        with self.assertRaises(ValueError):
            module.generate_prediction("US67066G1040", horizon_days=0)


if __name__ == "__main__":  # pragma: no cover - manual execution helper
    unittest.main()
