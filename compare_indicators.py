#!/usr/bin/env python3
"""
Compare TSSB indicator output with Stage1 indicator builder output.

Usage:
    python compare_indicators.py "BTC25_4 HM.CSV" indicators_BTCUSDT.xlsx
"""

import sys
import pandas as pd
from datetime import datetime
import numpy as np


def parse_tssb_timestamp(date_str, time_str):
    """
    Convert TSSB date/time format to ISO timestamp.

    Args:
        date_str: Format YYYYMMDD (e.g., "20250130")
        time_str: Format HHMM (e.g., "2100")

    Returns:
        ISO timestamp string
    """
    date_str = str(date_str).strip()
    time_str = str(time_str).strip()

    # Pad to expected lengths
    date_str = date_str.zfill(8)
    time_str = time_str.zfill(4)

    year = int(date_str[:4])
    month = int(date_str[4:6])
    day = int(date_str[6:8])

    hour = int(time_str[:2])
    minute = int(time_str[2:4])

    dt = datetime(year, month, day, hour, minute)
    return dt.isoformat() + 'Z'


def load_tssb_csv(filepath):
    """Load TSSB CSV output file with Date/Time columns."""
    # Read the CSV file
    df = pd.read_csv(filepath, sep='\s+')  # Whitespace-separated

    print(f"TSSB columns: {list(df.columns)[:10]}...")

    # Convert Date/Time columns to timestamp
    df['timestamp'] = df.apply(
        lambda row: parse_tssb_timestamp(row['Date'], row['Time']),
        axis=1
    )

    # Drop columns we don't need
    df = df.drop(columns=['Date', 'Time', 'Market'], errors='ignore')

    # Set timestamp as index
    df = df.set_index('timestamp')

    return df


def parse_excel_timestamp(ts_str):
    """Parse Excel timestamp format like '10/11/2025, 7:00:00 PM'."""
    # Handle different formats
    ts_str = str(ts_str).strip()

    # Try various formats
    formats = [
        "%m/%d/%Y, %I:%M:%S %p",  # 10/11/2025, 7:00:00 PM
        "%Y-%m-%dT%H:%M:%S.%fZ",  # ISO format
        "%Y-%m-%dT%H:%M:%SZ",     # ISO format without ms
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(ts_str, fmt)
            return dt.isoformat() + 'Z'
        except ValueError:
            continue

    raise ValueError(f"Could not parse timestamp: {ts_str}")


def load_excel_file(filepath):
    """Load Excel file from indicator builder."""
    df = pd.read_excel(filepath)

    print(f"Excel columns: {list(df.columns)}")

    # Assume first column is timestamp
    timestamp_col = df.columns[0]

    # Parse timestamps
    df['timestamp'] = df[timestamp_col].apply(parse_excel_timestamp)
    df = df.drop(columns=[timestamp_col])
    df = df.set_index('timestamp')

    return df


def compare_indicators(tssb_df, excel_df, tolerance=1e-6):
    """
    Compare indicator values between TSSB and Excel outputs.

    Args:
        tssb_df: DataFrame from TSSB
        excel_df: DataFrame from Excel
        tolerance: Maximum allowed difference for considering values equal

    Returns:
        Dictionary with comparison results
    """
    results = {
        'total_indicators': 0,
        'matching_indicators': 0,
        'mismatches': [],
        'missing_in_excel': [],
        'missing_in_tssb': [],
    }

    # Find common timestamps
    common_timestamps = sorted(list(set(tssb_df.index).intersection(set(excel_df.index))))

    if len(common_timestamps) == 0:
        print("ERROR: No common timestamps found!")
        print(f"TSSB sample: {tssb_df.index[:5].tolist()}")
        print(f"Excel sample: {excel_df.index[:5].tolist()}")
        return results

    print(f"\nFound {len(common_timestamps)} common timestamps")
    print(f"Timestamp range: {common_timestamps[0]} to {common_timestamps[-1]}")

    # Get column names (indicator names)
    tssb_indicators = set(tssb_df.columns)
    excel_indicators = set(excel_df.columns)

    # Find common indicators
    common_indicators = tssb_indicators.intersection(excel_indicators)
    results['total_indicators'] = len(common_indicators)

    # Track missing indicators
    results['missing_in_excel'] = list(tssb_indicators - excel_indicators)
    results['missing_in_tssb'] = list(excel_indicators - tssb_indicators)

    if results['missing_in_excel']:
        print(f"\nINFO: {len(results['missing_in_excel'])} indicators in TSSB but not in Excel:")
        for ind in sorted(results['missing_in_excel'])[:10]:
            print(f"  - {ind}")
        if len(results['missing_in_excel']) > 10:
            print(f"  ... and {len(results['missing_in_excel']) - 10} more")

    if results['missing_in_tssb']:
        print(f"\nWARNING: {len(results['missing_in_tssb'])} indicators in Excel but not in TSSB:")
        for ind in sorted(results['missing_in_tssb']):
            print(f"  - {ind}")

    print(f"\nComparing {len(common_indicators)} common indicators...")

    # Compare each common indicator
    for indicator in sorted(common_indicators):
        tssb_values = tssb_df.loc[common_timestamps, indicator]
        excel_values = excel_df.loc[common_timestamps, indicator]

        # Handle NaN values
        tssb_nan_mask = pd.isna(tssb_values)
        excel_nan_mask = pd.isna(excel_values)

        # Check if NaN patterns match
        nan_mismatch = ~(tssb_nan_mask == excel_nan_mask).all()

        # Compare non-NaN values
        valid_mask = ~(tssb_nan_mask | excel_nan_mask)

        if valid_mask.sum() == 0:
            # All values are NaN in both
            results['matching_indicators'] += 1
            continue

        tssb_valid = tssb_values[valid_mask].astype(float)
        excel_valid = excel_values[valid_mask].astype(float)

        # Calculate differences
        diff = np.abs(tssb_valid - excel_valid)
        max_diff = diff.max()
        mean_diff = diff.mean()

        if max_diff > tolerance or nan_mismatch:
            mismatch_count = (diff > tolerance).sum()

            # Find worst mismatch
            worst_idx = diff.idxmax()
            worst_tssb = tssb_values.loc[worst_idx]
            worst_excel = excel_values.loc[worst_idx]

            results['mismatches'].append({
                'indicator': indicator,
                'max_diff': max_diff,
                'mean_diff': mean_diff,
                'mismatch_count': mismatch_count,
                'total_values': len(tssb_valid),
                'nan_pattern_mismatch': nan_mismatch,
                'worst_timestamp': worst_idx,
                'worst_tssb': worst_tssb,
                'worst_excel': worst_excel,
            })
        else:
            results['matching_indicators'] += 1

    return results


def print_results(results):
    """Print comparison results."""
    print("\n" + "="*80)
    print("COMPARISON RESULTS")
    print("="*80)

    print(f"\nTotal indicators compared: {results['total_indicators']}")
    print(f"Matching indicators: {results['matching_indicators']}")
    print(f"Mismatched indicators: {len(results['mismatches'])}")

    if results['mismatches']:
        print("\n" + "-"*80)
        print("MISMATCHES FOUND:")
        print("-"*80)
        for mismatch in results['mismatches']:
            print(f"\nIndicator: {mismatch['indicator']}")
            print(f"  Max difference: {mismatch['max_diff']:.10f}")
            print(f"  Mean difference: {mismatch['mean_diff']:.10f}")
            print(f"  Mismatched values: {mismatch['mismatch_count']} / {mismatch['total_values']}")
            if mismatch['nan_pattern_mismatch']:
                print(f"  WARNING: NaN patterns don't match!")
            print(f"  Worst mismatch at {mismatch['worst_timestamp']}:")
            print(f"    TSSB: {mismatch['worst_tssb']:.10f}")
            print(f"    Excel: {mismatch['worst_excel']:.10f}")
    else:
        print("\n✅ ALL INDICATORS MATCH!")

    print("\n" + "="*80)


def main():
    if len(sys.argv) != 3:
        print("Usage: python compare_indicators.py <tssb_file.csv> <excel_file.xlsx>")
        sys.exit(1)

    tssb_file = sys.argv[1]
    excel_file = sys.argv[2]

    print(f"Loading TSSB file: {tssb_file}")
    tssb_df = load_tssb_csv(tssb_file)
    print(f"  Loaded {len(tssb_df)} rows, {len(tssb_df.columns)} indicators")

    print(f"\nLoading Excel file: {excel_file}")
    excel_df = load_excel_file(excel_file)
    print(f"  Loaded {len(excel_df)} rows, {len(excel_df.columns)} indicators")

    print("\nComparing indicators...")
    results = compare_indicators(tssb_df, excel_df, tolerance=1e-6)

    print_results(results)

    # Exit with error code if mismatches found
    if results['mismatches']:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
