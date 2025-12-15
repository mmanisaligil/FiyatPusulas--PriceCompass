import pytest

from app.services.er import normalize_text


def test_normalize_text_strips_and_folds():
    text = "İçecek Şekerli-123!"
    assert normalize_text(text) == "ICECEK SEKERLI 123"
