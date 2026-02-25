import threading

_thread_locals = threading.local()

def set_inquilino(inquilino):
    _thread_locals.inquilino = inquilino

def get_inquilino():
    return getattr(_thread_locals, "inquilino", None)
