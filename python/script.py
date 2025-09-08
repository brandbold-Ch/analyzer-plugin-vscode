import pkgutil
import inspect
import pkg_resources
from pkg_resources import WorkingSet
import json
import importlib
from types import ModuleType
import warnings
import contextlib
from inspect import Signature
import os
import io

SKIP_METHODS = [
    "__repr__", "__str__", "__format__", "__bytes__",
    "__bool__", "__int__", "__float__", "__complex__", "__index__",
    "__eq__", "__ne__", "__lt__", "__le__", "__gt__", "__ge__",
    "__add__", "__sub__", "__mul__", "__matmul__", "__truediv__",
    "__floordiv__", "__mod__", "__divmod__", "__pow__",
    "__lshift__", "__rshift__", "__and__", "__or__", "__xor__",
    "__radd__", "__rsub__", "__rmul__", "__rmatmul__", "__rtruediv__",
    "__rfloordiv__", "__rmod__", "__rdivmod__", "__rpow__",
    "__rlshift__", "__rrshift__", "__rand__", "__ror__", "__rxor__",
    "__iadd__", "__isub__", "__imul__", "__imatmul__", "__itruediv__",
    "__ifloordiv__", "__imod__", "__ipow__", "__ilshift__",
    "__irshift__", "__iand__", "__ior__", "__ixor__",
    "__getattr__", "__getattribute__", "__setattr__", "__delattr__", "__dir__",
    "__len__", "__getitem__", "__setitem__", "__delitem__",
    "__iter__", "__next__", "__contains__",
    "__enter__", "__exit__",
    "__call__", "__del__",
    "__copy__", "__deepcopy__", "__reduce__", "__reduce_ex__",
    "__hash__", "__sizeof__", "__class_getitem__", "__missing__"
]
SKIP_PACKAGES = [
    "pygments", "certifi", "rsa", "rich", "click", 
    "idna", "chardet", "pip", "six", "mdurl", "ecdsa", 
    "colorama", "arrow", "text_unicode", "pyasn1", 
    "typing_inspection", "text_unidecode", "binaryornot", "annotated_type", "anyio", "annotated_types"
]
SKIP_MODULES = [
    "builtin", "dataclasses", "typing", "typing_extensions", None
]
warnings.filterwarnings("ignore")


def flatten(signature: Signature) -> str:
    return signature.__str__()

packages = dict()
big_metadata = []  


def safe_import(name: str):
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return importlib.import_module(name)
    except SystemExit:
        return None
    except Exception:
        return None
    

def build_tree(name: str, members: list[tuple]):
    context = {
        "package": name,
        "base": {"functions": [], "classes": []}
    }
    
    for name_0, obj_0 in members: 

        if inspect.isclass(obj_0):
            functions = []
            
            for name_1, obj_1 in inspect.getmembers(obj_0, inspect.isfunction):
                if obj_1.__module__ in SKIP_MODULES or name_1 in SKIP_METHODS:
                    continue
                                
                functions.append({
                    "name": name_1,
                    "doc": inspect.getdoc(obj_1),
                    "signature": flatten(inspect.signature(obj_1))
                })
            
            context["base"]["classes"].append({
                "name": obj_0.__name__,
                "doc": inspect.getdoc(obj_0),
                "functions": functions                
            })
            
            
        elif inspect.isfunction(obj_0):
            context["base"]["functions"].append({
                "name": obj_0.__name__,
                "doc": inspect.getdoc(obj_0),
                "signature": flatten(inspect.signature(obj_0))
            })
        
    big_metadata.append(context)


def find_subpackages(package: ModuleType) -> None:
    pkg_name = package.__name__
    
    if pkg_name in SKIP_PACKAGES:
        return
    
    packages[pkg_name] = dict()
    packages[pkg_name]["members"] = inspect.getmembers(package)
    packages[pkg_name]["subpackages"] = []

    if hasattr(package, "__path__"):      
        for finder, name, ispkg in pkgutil.walk_packages(package.__path__, pkg_name + "."):
            try:
                if name.startswith("numpy.f2py"):
                    continue
                
                sub_package = safe_import(name)
                packages[pkg_name]["subpackages"].append({
                    "name": name,
                    "members": inspect.getmembers(sub_package)
                }) 
            except SystemExit:
                pass
            except Exception:
                pass
            
        
def main(packages: WorkingSet) -> None:
    for package in packages:
        try:
            library_name = package.project_name.replace("-", "_")
            find_subpackages(importlib.import_module(library_name))
        except Exception:
            pass


if __name__ == "__main__":
    all_libraries = pkg_resources.working_set
    main(all_libraries)    
    
    for k, v in packages.items():
        build_tree(k, v["members"])
    
    path = os.path.join(__file__, "..", "data.json")
    with open(path, "w") as data:
        json.dump(big_metadata, data, indent=2)
        
    print(len(big_metadata))