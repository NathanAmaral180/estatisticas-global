from time import time

_cache = {}

def get_cache(key: str):
    item = _cache.get(key)
    if not item:
        return None
    value, expires_at = item
    if time() > expires_at:
        _cache.pop(key, None)
        return None
    return value

def set_cache(key: str, value, ttl_seconds: int):
    _cache[key] = (value, time() + ttl_seconds)