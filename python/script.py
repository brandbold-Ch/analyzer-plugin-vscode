import pkgutil
import inspect
import pkg_resources
import json
import importlib
from types import ModuleType
import warnings


"""
{
    packages: [ 
        {
            base: {
                functions: [
                    {
                        of: "base"
                        name: "",
                        doc: "",
                        ref: "",
                        signature: "() => type"
                    }
                ],
                classes: [
                    {
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

def to_str(obj) -> str:
    return str(obj)

warnings.filterwarnings("ignore")
SKIP = {
    "pygments", "certifi", "rsa", "rich", "click", 
    "idna", "chardet", "pip", "six", "mdurl", "ecdsa"
}
modules = dict()
big_metadata = dict()


def find_objects(name: str, references: list):
    big_metadata[name] = {
        "base": { "functions": [], "classes": [] }
    }
    for index, (name, ref) in enumerate(references):        
        if inspect.isclass(ref):
            big_metadata[name][ref.__name__]["classes"].append({
                "name": ref.__name__,
                "doc": inspect.getdoc(ref),
                "ref": to_str(ref),
                "functions": []                
            })
            
            for items in inspect.getmembers(ref, inspect.isfunction):
                big_metadata[name][ref.__name__]["functions"].apped({
                    "of": name,
                    "name": ref.__name__,
                    "doc": inspect.getdoc(ref),
                    "ref": to_str(ref),                
                    "signature": inspect.signature(ref)
                })
                
        elif inspect.isfunction(ref):
            big_metadata[name]["base"]["functions"].apped({
                "of": name,
                "name": ref.__name__,
                "doc": inspect.getdoc(ref),
                "ref": to_str(ref),                
                "signature": inspect.signature(ref)
            })


def find_artifacts(package: ModuleType) -> None:
    package_name = package.__name__
    
    if package_name in SKIP:
        return
    
    modules[package_name] = dict()
    modules[package_name]["objects"] = inspect.getmembers(package)
    modules[package_name]["submodules_objects"] = []

    if hasattr(package, "__path__"):      
        for finder, name, ispkg in pkgutil.walk_packages(package.__path__, package_name + "."):
            try:
                if name.startswith("numpy.f2py"):
                    continue
                sub_package = importlib.import_module(name)
                modules[package_name]["submodules_objects"].append(inspect.getmembers(sub_package)) 
            except Exception:
                pass
    
    for k, v in modules.items():
        print(k)
        find_objects(k, v["objects"])
    
    
def main(libraries: list) -> None:
    for library in libraries:
        try:
            library_name = library.project_name.replace("-", "_")
            find_artifacts(importlib.import_module(library_name))
        except Exception:
            pass


if __name__ == "__main__":
    all_libraries = list(pkg_resources.working_set)
    main(all_libraries)    
