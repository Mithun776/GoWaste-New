from cryptography.fernet import Fernet
import os

def encrypt(data: str) -> str:
    key = os.getenv("ENC_DEC_KEY")
    if key is None:
        raise ValueError("ENC_DEC_KEY environment variable is not set")
    fernet_client = Fernet(key.encode("utf-8"))
    enc_data = fernet_client.encrypt(data.encode("utf-8"))
    return enc_data.decode("utf-8")

def decrypt(data: str) -> str:
    key = os.getenv("ENC_DEC_KEY")
    if key is None:
        raise ValueError("ENC_DEC_KEY environment variable is not set")
    fernet_client = Fernet(key.encode("utf-8"))
    dec_data = fernet_client.decrypt(data.encode("utf-8"))
    return dec_data.decode("utf-8")


if __name__ == "__main__":
    print(Fernet.generate_key())
