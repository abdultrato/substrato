"""Compatibility settings package.

Pytest (and some plugins) imports the stdlib `platform` module before the repo
root is on `sys.path`, which makes `platform.settings...` fail because stdlib
`platform` is not a package.

These wrappers load the project package from disk and then re-export the real
settings modules under a non-conflicting name.
"""

