import pkgutil
import inspect
import pkg_resources
from pkg_resources import WorkingSet
import json
import importlib
from types import ModuleType
import warnings
from typing import NamedTuple
from collections import namedtuple
from inspect import Signature
import os

"""
{
    fastapi: {
        members: [
            ("FastAPI", <class FastAPI>)
        ],
        subpackages: [
            {
                name: "fastapi.middlewares",
                members: [()]
            }
        ]
    }
}
"""

"""
{
    packages: [ 
        {
            base: {
                functions: [
                    {
                        name: "",
                        doc: "",
                        signature: "() => type"
                    }
                ],
                classes: [
                    {
                        name: "Flask"
                        doc: "Flask class"
                        functions: [
                            {
                                name: "",
                                doc: "",
                                signature: "() => type"
                            }
                        ],
                    }
                ]
            },
            dependencies: [
                {
                    functions: [
                        {
                            func: docstring,
                            signature: "() => type"
                        }
                    ],
                    classes: {
                        name: "Flask"
                        doc: "Flask class"
                        functions: [
                            {
                                of: "Flask"
                                name: "",
                                doc: "",
                                ref: "",                                
                                signature: "() => type"
                            }
                        ],
                    }
                }   
            ]
        }
    ]
}
"""

def to_str(signature: Signature) -> str:
    return signature.__str__()


warnings.filterwarnings("ignore")
SKIP_PACKAGES = {
    "pygments", "certifi", "rsa", "rich", "click", 
    "idna", "chardet", "pip", "six", "mdurl", "ecdsa"
}
SKIP_MODULES = {
    "builtin", "dataclasses", "typing", "typing_extensions", None
}
packages = dict()
big_metadata = []


def find_functions(initial_ref: object, storage: list) -> None:
    for name, ref in inspect.getmembers(initial_ref, inspect.isfunction):
        if ref.__module__ in SKIP_MODULES:
            continue
                
        storage.append({
            "name": name,
            "doc": inspect.getdoc(ref),
            "signature": to_str(inspect.signature(ref))
        })    


def find_classes():
    ...
    

def build_tree(name: str, members: list[tuple]):
    context = {
        "package": name,
        "base": {"functions": [], "classes": []}
    }
    
    for name0, ref0 in members: 

        if inspect.isclass(ref0):
            ref_name = ref0.__name__
            functions = []
            
            for name1, ref1 in inspect.getmembers(ref0, inspect.isfunction):
                if ref1.__module__ in SKIP_MODULES:
                    continue
                
                functions.append({
                    "name": name1,
                    "doc": inspect.getdoc(ref1),
                    "signature": to_str(inspect.signature(ref1))
                })
            
            context["base"]["classes"].append({
                "name": ref_name,
                "doc": inspect.getdoc(ref0),
                "functions": functions                
            })
            
            
        elif inspect.isfunction(ref0):
            context["base"]["functions"].append({
                "name": ref0.__name__,
                "doc": inspect.getdoc(ref0),
                "signature": to_str(inspect.signature(ref0))
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
                
                sub_package = importlib.import_module(name)
                packages[pkg_name]["subpackages"].append({
                    "name": name,
                    "members": inspect.getmembers(sub_package)
                }) 
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