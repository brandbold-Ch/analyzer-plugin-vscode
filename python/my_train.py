import pkg_resources
from pkg_resources import DistInfoDistribution
import inspect
import json
import importlib
import warnings
import os
import sys
from typing import Any
import pkgutil
import enum
warnings.filterwarnings("ignore", message="Setuptools is replacing distutils")

classes = []
functions = []
modules = []
package = importlib.import_module("fastapi")
all_packages = pkgutil.walk_packages(package.__path__, package.__name__+".")

for loader, name, ispkg in all_packages:
    try:
        mod = importlib.import_module(name)
        modules.append(mod)
    except:
        pass
    
    
for module in modules:
    try:
        for name, ref in inspect.getmembers(module):
            if ref.__module__ in ["builtin", "typing", "enum"]:
                continue
            
            if inspect.isclass(ref):
                classes.append(ref)
                
            elif inspect.isfunction(ref):
                functions.append(ref)
    except:
        pass
    
print(len(classes))
print(len(functions))
print(classes)
