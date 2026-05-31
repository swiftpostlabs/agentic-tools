from typing import Any

config: Any
load_path: list[str]
translations: Any

def set(key: str, value: object) -> None: ...
def t(key: str, **kwargs: object) -> str: ...
