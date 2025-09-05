import pkg_resources
from pkg_resources import DistInfoDistribution
import inspect
import json
import warnings
import os
import sys

warnings.filterwarnings("ignore", message="Setuptools is replacing distutils")

pkg_resources_data = dict()
classes = []
functions = []
others = []
methods = []
modules = []
static_methods = []


def to_str(obj):
    return str(obj)


for artifact in list(pkg_resources.working_set):
    try:
        package = __import__(artifact.project_name.replace("-", "_"))

        for i in dir(package): 
            ref = getattr(package, i)
            
            if inspect.isfunction(ref):
                functions.append({
                    to_str(ref): inspect.getdoc(ref),
                    "signature": to_str(inspect.signature(ref))
                })
                
            elif inspect.isclass(ref):
                f = []
                c = []
                

                for j in inspect.getmembers(ref):
                    if j[0].startswith("__"):
                        continue
                    
                    if inspect.isfunction(j[1]):
                        f.append({
                            to_str(j[1]): inspect.getdoc(j[1])
                        })
                    
                    elif inspect.isclass(j[1]):
                        c.append({
                            to_str(j[1]): inspect.getdoc(j[1])
                        })                
                        
                classes.append({
                    to_str(ref): inspect.getdoc(ref),
                    "metadata": {
                        "functions": f.copy(),
                        "classes": c.copy()
                    }
                })
                f.clear()
                c.clear()
                
            elif inspect.ismethod(ref):
                methods.append({
                    to_str(ref): inspect.getdoc(ref)
                })
                
            elif inspect.ismodule(ref):
                modules.append({
                    to_str(ref): inspect.getdoc(ref)
                })
                
            elif inspect.ismemberdescriptor(ref):
                static_methods.append({
                    to_str(ref): inspect.getdoc(ref)
                })
                
            elif callable(ref):
                others.append(to_str(ref))
    
        pkg_resources_data[artifact.project_name] = {
            "clasess": classes.copy(),
            "functions": functions.copy(),
            "modules": modules.copy(),
            "others": others.copy(),
            "methods": methods.copy(),
            "static_methods": static_methods.copy()
        }
        
        functions.clear()
        methods.clear()
        modules.clear()
        others.clear()
        methods.clear()
        static_methods.clear()
        
    except ModuleNotFoundError:
        pass
    
path = os.path.join(__file__, "..", "data.json")
with open(path, "w") as data:
    json.dump(pkg_resources_data, data, indent=2)
