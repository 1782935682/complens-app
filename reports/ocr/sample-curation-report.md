# OCR Sample Curation Report

Generated: 2026-06-21T10:24:59.743Z

## Summary

- originalSamples: 500
- keptSamples: 499
- rejectedThisRun: 1
- blocklistTotal: 741

## Rejected This Run

- 3250393464164-nutrition (beverage:nutrition, nutrition): invalid_sample; reasons core_image_missing_nutrition_evidence, weak_core_nutrition_extraction; source https://world.openfoodfacts.org/product/3250393464164

## Next Step

- Run `npm run ocr:evaluate` again. If the manifest has fewer than the target samples, it will rebuild from public sources while avoiding blocked samples.
