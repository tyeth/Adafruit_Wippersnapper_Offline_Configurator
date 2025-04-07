import requests
import re

BASE_API = 'https://www.adafruit.com/api'


def get_product_image(url):
    if '/product/' in url:
        product_id = re.search(r'/product/(\d+)', url)
        if product_id:
            product_id = product_id.group(1)
            api_url = f'{BASE_API}/product/{product_id}'
            response = requests.get(api_url)
            if response.ok:
                data = response.json()
                return data.get('product_image')
    elif '/category/' in url:
        category_id = re.search(r'/category/(\d+)', url)
        if category_id:
            category_id = category_id.group(1)
            api_url = f'{BASE_API}/category/{category_id}'
            response = requests.get(api_url)
            if response.ok:
                data = response.json()
                products = data.get('products')
                if products:
                    return products[0].get('product_image')

    return None


# Example usage:
product_url = 'https://www.adafruit.com/product/998'
category_url = 'https://www.adafruit.com/category/118'

product_image_url = get_product_image(product_url)
print('Product Image:', product_image_url)

category_image_url = get_product_image(category_url)
print('First Product Image from Category:', category_image_url)
