import pytest
from app.services.verdict import get_verdict, VerdictLabel


def test_get_verdict_insufficient_data():
    prices_ever = [10000, 10000, 10000, 10000] # only 4 data points
    prices_30d = [10000, 10000, 10000, 10000]
    verdict = get_verdict(10000, prices_30d, prices_ever)
    assert verdict.label == VerdictLabel.INSUFFICIENT_DATA
    assert verdict.deal_score == 5

def test_get_verdict_fake_discount():
    # Base price was 100, bumped to 150
    prices_ever = [10000, 10000, 10000, 10000, 10000, 10000]
    prices_30d = [10000, 10000, 10000, 10000, 15000, 15000] 
    
    # Current price is 150, avg 30d is 11666. 150 > 116.66 * 1.05
    verdict = get_verdict(15000, prices_30d, prices_ever)
    assert verdict.label == VerdictLabel.FAKE_DISCOUNT
    assert verdict.deal_score in (1, 2)

def test_get_verdict_best_price():
    # Normal price is 150
    prices_ever = [15000, 15000, 15000, 15000, 15000, 15000]
    prices_30d = [15000, 15000, 15000, 15000, 12000, 10000] # dropped recently
    
    # Current price is 10000, all time low is 10000
    verdict = get_verdict(10000, prices_30d, prices_ever)
    assert verdict.label == VerdictLabel.BEST_PRICE
    assert verdict.deal_score in (9, 10)

def test_get_verdict_good_deal():
    # Normal price is 120
    prices_ever = [10000, 12000, 12000, 12000, 12000, 12000, 12000] 
    prices_30d = [12000, 12000, 12000, 12000, 12000, 10500] 
    
    # Current price is 10500. Avg 30d is ~11750. 
    # Drop from avg > 10%, but not all-time low.
    verdict = get_verdict(10500, prices_30d, prices_ever)
    assert verdict.label == VerdictLabel.GOOD_DEAL
    assert verdict.deal_score in (7, 8)

def test_get_verdict_fair_price():
    # Price is stable
    prices_ever = [10000, 10000, 10000, 10000, 10000]
    prices_30d = [10000, 10000, 10000, 10000, 10000] 
    
    verdict = get_verdict(10000, prices_30d, prices_ever)
    assert verdict.label == VerdictLabel.FAIR_PRICE
    assert verdict.deal_score in (5, 6)
