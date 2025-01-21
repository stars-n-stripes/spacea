import requests
from bs4 import BeautifulSoup
import string

def extract_bases_from_page(url):
    """
    Extracts air force bases from the USAF Military website.
    
    Args:
        url (str): The URL of the page to extract the bases from.

    Returns:
        A list of strings, where each string is a base name.
    
    """

    try:
        response = requests.get(url)
        response.raise_for_status() # raise an exception in case of failure

        soup = BeautifulSoup(response.content, 'html.parser')

        # find all elements that contain base names
        base_name_elements = soup.find_all('a', class_='table')

        bases = []

        for element in base_name_elements:
            base_name = element.text.strip()  # extract text and remove extra whitespace
            bases.append(base_name)
        
        return bases
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {url}, Error: {e}")
        return []
    
def get_all_bases(base_url, letter_param):
    """
    Scrapes all pages (A-Z) of the website to get a complete list of bases.

    Args:
        base_url:  The base URL of the website.
        letter_param: The URL parameter used to specify the letter (e.g., 'letter=').

    Returns:
        A list of strings, where each string is a base name.    
    """

    all_bases = []

    for letter in string.ascii_uppercase:
        page_url = f"{base_url}?{letter_param}={letter}" # Construct URL for each letter
        print(f"Scraping: {page_url}")
        bases = extract_bases_from_page(page_url)
        all_bases.extend(bases)
    
    return all_bases
