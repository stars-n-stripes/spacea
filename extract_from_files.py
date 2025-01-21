import json
from bs4 import BeautifulSoup
import re

def extract_all_bases_from_file(filepath):
    """
    Extracts all base information from a single HTML file containing a complete JSON list.

    Args:
        filepath (str): The path to the HTML file.
    
    Returns:
        A list of dictionaries, where each dictionary represents a base, or None if an error occurs.
    """

    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            soup = BeautifulSoup(file, 'html.parser')
            
            # find the json data
            script_tag = soup.find('script', string=re.compile(r'afp\.indexModel\.srcData'))

            if script_tag:
                # extract the json data
                match = re.search(r'afp\.indexModel\.srcData\s*=\s*(\[.+?\]);', script_tag.string)
                if match:
                    json_string = match.group(1)
                    json_data = json.loads(json_string)

                # now assuming the json_data is a list of bases already:
                if isinstance(json_data, list):
                    all_bases = []
                    for base in json_data:
                        base_name = base.get("displayTitle")
                        majcom = base.get("majcom")
                        joint_base = False
                        national_guard = False
                        reserve = False

                        # check for "Join Base" in the name
                        if base_name and base_name.startswith("Joint Base"):
                            joint_base = True
                            # remove "Joint Base" from the name
                            base_name = base_name.replace("Joint Base", "", 1).strip()
                        
                        # check for  "(ANG)" in the end of the name
                        if (base_name and base_name.endswith("(ANG)")) or majcom == "ANG":
                            national_guard = True
                            # remove "(ANG)" from the name
                            base_name = base_name.replace("(ANG)", "").strip()

                        # check for "(AFRC)" in the end of the name
                        if base_name and base_name.endswith("(AFRC)"):
                            reserve = True
                            # remove "(AFRC)" from the name
                            base_name = base_name.replace("(AFRC)", "").strip()
                        
                        # remove any parentheses that might be the last word in name
                        base_name = re.sub(r'\s*\([^)]*\)$', '', base_name).strip()

                        # remove anything after a comma that ends the name
                        base_name = re.sub(r',\s[A-Z]{2}', '', base_name).strip()

                        base_data = {
                            "name" : base_name,
                            "country" : base.get("country"),
                            "externalUrl" : base.get("externalUrl"),
                            "majcom" : majcom,
                            "state" : base.get("state"),
                            "joint_base" : joint_base,
                            "national_guard" : national_guard,
                            "reserve" : reserve
                        }

                        all_bases.append(base_data)
                    return all_bases
                else:
                    print("Error: JSON data is not a list of bases.")
                    return None
            else:
                print(f"Error: Could not find JSON data in file: {filepath}")
                return None
            
    except FileNotFoundError:
        print(f"File not found: {filepath}")
        return None
    except json.JSONDecodeError:
        print(f"File is not a valid JSON file: {filepath}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

filepath = "sites\\P_AFP - Bases A-Z.html"
all_bases = extract_all_bases_from_file(filepath)

if all_bases:
    print("Extracted Base Information:")
    for base in all_bases:
        print(base)
# Output to json file
with open('all_bases.json', 'w') as file:
    json.dump(all_bases, file, indent=4)
