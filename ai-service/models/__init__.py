"""Model package exports.

Kronos imports are intentionally lazy so lightweight API schema modules such as
`models.paper_desk` do not load the ML stack during unit tests or simple API
route imports.
"""

__all__ = ["KronosTokenizer", "Kronos", "KronosPredictor", "get_model_class"]

_MODEL_ATTRS = {
    "kronos_tokenizer": "KronosTokenizer",
    "kronos": "Kronos",
    "kronos_predictor": "KronosPredictor",
}


def __getattr__(name):
    if name in _MODEL_ATTRS.values():
        from .kronos import Kronos, KronosPredictor, KronosTokenizer

        exports = {
            "KronosTokenizer": KronosTokenizer,
            "Kronos": Kronos,
            "KronosPredictor": KronosPredictor,
        }
        return exports[name]
    raise AttributeError(f"module 'models' has no attribute '{name}'")


def get_model_class(model_name):
    class_name = _MODEL_ATTRS.get(model_name)
    if class_name:
        return __getattr__(class_name)
    print(f"Model {model_name} not found in model_dict")
    raise NotImplementedError


