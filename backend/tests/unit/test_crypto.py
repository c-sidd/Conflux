from app.core.crypto import TokenCipher


def test_token_encryption_and_decryption():
    cipher = TokenCipher()
    token = "ya29.a0AfH6SMD_Fake_Google_Refresh_Token_12345"
    encrypted = cipher.encrypt(token)

    assert "ciphertext" in encrypted
    assert "nonce" in encrypted
    assert encrypted["key_version"] == "v1"
    assert encrypted["ciphertext"] != token

    decrypted = cipher.decrypt(encrypted)
    assert decrypted == token


def test_empty_token_encryption():
    cipher = TokenCipher()
    encrypted = cipher.encrypt("")
    assert encrypted["ciphertext"] == ""
    assert cipher.decrypt(encrypted) == ""
