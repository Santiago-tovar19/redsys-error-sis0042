import base64
import hmac
import json
import hashlib
from Crypto.Cipher import DES3  
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from base.models import Order
from django.shortcuts import get_object_or_404

TERMINAL = "001"
CURRENCY = "978"  # EUR
SECRET_KEY = "sq7HjrUOBfKmC576ILgskD5srU870gJ7"  # Clave secreta en Base64
MERCHANT_CODE = "364392803"
REDSYS_URL = "https://sis-t.redsys.es:25443/sis/realizarPago"  # URL de redireccionamiento directo de Redsys

def create_merchant_parameters(order_id, amount):
    """Genera los parámetros en JSON y los codifica en Base64."""
    params = {
        "DS_MERCHANT_AMOUNT": amount, 
        "DS_MERCHANT_ORDER": order_id.zfill(12), 
        "DS_MERCHANT_MERCHANTCODE": MERCHANT_CODE,
        "DS_MERCHANT_CURRENCY": CURRENCY,
        "DS_MERCHANT_TERMINAL": TERMINAL,
        "DS_MERCHANT_TRANSACTIONTYPE": "0",  # Tipo de transacción (pago)
        "DS_MERCHANT_URLOK": "http://tu-app.com/pago-exitoso/",
        "DS_MERCHANT_URLKO": "http://tu-app.com/pago-fallido/",
    }
    json_params = json.dumps(params)
    print("Merchant Parameters (JSON):", json_params)  # Ver los parámetros antes de codificar
    encoded_params = base64.b64encode(json_params.encode()).decode()
    print("Merchant Parameters (Base64):", encoded_params)  # Ver los parámetros codificados en Base64
    return encoded_params


def create_signature(order_id, merchant_parameters):
    """Genera la firma diversificando la clave con el pedido y aplicando HMAC-SHA256."""
    # Decodificar la clave secreta desde Base64
    decoded_key = base64.b64decode(SECRET_KEY)
    print("Decoded Key:", decoded_key)

    # Diversificar la clave usando el número de pedido (3DES) y ajustarlo a 16 bytes
    order_padded = order_id.zfill(12).encode().ljust(16, b'\0')  # Cambia 24 a 16 bytes
    print("Order Padded (16 bytes):", order_padded)  # Ver el número de pedido en bytes de longitud 16

    cipher = DES3.new(decoded_key, DES3.MODE_ECB)
    diversified_key = cipher.encrypt(order_padded)
    print("Diversified Key (3DES):", diversified_key)

    # Generar la firma HMAC-SHA256
    signature = hmac.new(diversified_key, merchant_parameters.encode(), hashlib.sha256).digest()
    signature_base64 = base64.b64encode(signature).decode().rstrip("=")  # Eliminar el relleno de '='
    print("Generated Signature (Base64 without padding):", signature_base64)

    return signature_base64



@csrf_exempt
def create_payment(request):
    """Genera la solicitud de pago y devuelve los datos para el frontend."""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            print("Request Data:", data)  # Ver los datos recibidos del frontend

            order_id = str(data["order_id"]).zfill(12)
            print("Order ID (12 digits):", order_id)  # Ver el order_id formateado

            # Convertir el monto a céntimos y asegurar que sea un string
            amount = str(int(float(data["amount"]) * 100))  
            print("Amount (in cents):", amount)  # Ver el monto convertido

            # Crear Ds_MerchantParameters codificado en Base64
            merchant_parameters = create_merchant_parameters(order_id, amount)

            signature = create_signature(order_id, merchant_parameters)

            response_data = {
                "Ds_SignatureVersion": "HMAC_SHA256_V1",
                "Ds_MerchantParameters": merchant_parameters,
                "Ds_Signature": signature,
                "url": REDSYS_URL  
            }
            print("Response Data:", response_data)  
            return JsonResponse(response_data)

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)

        except KeyError:
            return JsonResponse({"error": "Missing order_id or amount"}, status=400)

    return JsonResponse({"error": "Invalid request method"}, status=405)


@csrf_exempt
def payment_success(request):
    """Cambia el estado de la orden a pagado si el pago es exitoso."""
    if request.method == "POST":
        order_id = request.POST.get("Ds_Order")  # ID de la orden retornado por Redsys
        order = get_object_or_404(Order, id=order_id)
        order.isPaid = True
        order.save()

        return JsonResponse({"status": "success"})

    return JsonResponse({"error": "Invalid request method"}, status=405)
