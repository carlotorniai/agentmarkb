#!/usr/bin/env python3
"""
Generate simple PNG icons for the KB Manager Chrome extension.
Creates 16x16, 48x48, and 128x128 pixel icons.
"""

import struct
import zlib

def create_png(width, height, pixels):
    """Create a PNG image from raw pixel data."""

    def make_chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc

    # PNG header
    header = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)

    # IDAT chunk (image data)
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # Filter byte (none)
        for x in range(width):
            idx = (y * width + x) * 4
            raw_data += bytes(pixels[idx:idx+4])

    compressed = zlib.compress(raw_data, 9)
    idat = make_chunk(b'IDAT', compressed)

    # IEND chunk
    iend = make_chunk(b'IEND', b'')

    return header + ihdr + idat + iend


def create_kb_icon(size):
    """Create the KB icon at the specified size."""
    pixels = []

    # Colors
    bg_color = (37, 99, 235, 255)  # Blue #2563eb
    text_color = (255, 255, 255, 255)  # White
    transparent = (0, 0, 0, 0)

    # Calculate dimensions
    padding = max(1, size // 8)
    corner_radius = max(2, size // 6)

    for y in range(size):
        for x in range(size):
            # Check if we're inside the rounded rectangle
            in_rect = True

            # Top-left corner
            if x < corner_radius and y < corner_radius:
                dx = corner_radius - x
                dy = corner_radius - y
                if dx * dx + dy * dy > corner_radius * corner_radius:
                    in_rect = False

            # Top-right corner
            if x >= size - corner_radius and y < corner_radius:
                dx = x - (size - corner_radius - 1)
                dy = corner_radius - y
                if dx * dx + dy * dy > corner_radius * corner_radius:
                    in_rect = False

            # Bottom-left corner
            if x < corner_radius and y >= size - corner_radius:
                dx = corner_radius - x
                dy = y - (size - corner_radius - 1)
                if dx * dx + dy * dy > corner_radius * corner_radius:
                    in_rect = False

            # Bottom-right corner
            if x >= size - corner_radius and y >= size - corner_radius:
                dx = x - (size - corner_radius - 1)
                dy = y - (size - corner_radius - 1)
                if dx * dx + dy * dy > corner_radius * corner_radius:
                    in_rect = False

            if not in_rect:
                pixels.extend(transparent)
                continue

            # Draw "KB" text
            # We'll use a simple approach: define letter patterns
            letter_height = size - 2 * padding
            letter_width = (size - 3 * padding) // 2

            # Adjust positions
            k_start_x = padding
            b_start_x = padding + letter_width + padding
            letter_start_y = padding

            # Check if current pixel is part of K
            in_k = False
            in_b = False

            rx = x - k_start_x
            ry = y - letter_start_y

            if 0 <= rx < letter_width and 0 <= ry < letter_height:
                # K shape: vertical line on left, diagonal lines meeting in middle
                stroke_width = max(1, letter_width // 4)

                # Left vertical bar of K
                if rx < stroke_width:
                    in_k = True

                # Upper diagonal of K (from top-right to middle-left)
                mid_y = letter_height // 2
                if ry < mid_y:
                    # Going from (letter_width, 0) to (stroke_width, mid_y)
                    expected_x = letter_width - (ry / mid_y) * (letter_width - stroke_width)
                    if abs(rx - expected_x) < stroke_width:
                        in_k = True

                # Lower diagonal of K (from middle-left to bottom-right)
                if ry >= mid_y:
                    # Going from (stroke_width, mid_y) to (letter_width, letter_height)
                    progress = (ry - mid_y) / (letter_height - mid_y)
                    expected_x = stroke_width + progress * (letter_width - stroke_width)
                    if abs(rx - expected_x) < stroke_width:
                        in_k = True

            # Check if current pixel is part of B
            rx = x - b_start_x
            ry = y - letter_start_y

            if 0 <= rx < letter_width and 0 <= ry < letter_height:
                stroke_width = max(1, letter_width // 4)
                mid_y = letter_height // 2

                # Left vertical bar of B
                if rx < stroke_width:
                    in_b = True

                # Top horizontal bar
                if ry < stroke_width:
                    in_b = True

                # Middle horizontal bar
                if abs(ry - mid_y) < stroke_width // 2 + 1:
                    in_b = True

                # Bottom horizontal bar
                if ry >= letter_height - stroke_width:
                    in_b = True

                # Right side curves (simplified as vertical lines at the end)
                if rx >= letter_width - stroke_width:
                    # Upper bump (from top to middle)
                    if stroke_width <= ry <= mid_y - stroke_width // 2:
                        in_b = True
                    # Lower bump (from middle to bottom)
                    if mid_y + stroke_width // 2 <= ry <= letter_height - stroke_width:
                        in_b = True

            if in_k or in_b:
                pixels.extend(text_color)
            else:
                pixels.extend(bg_color)

    return pixels


def main():
    sizes = [16, 48, 128]

    for size in sizes:
        print(f"Generating {size}x{size} icon...")
        pixels = create_kb_icon(size)
        png_data = create_png(size, size, pixels)

        filename = f"icon{size}.png"
        with open(filename, 'wb') as f:
            f.write(png_data)
        print(f"  Saved {filename}")

    print("\nAll icons generated successfully!")


if __name__ == '__main__':
    main()
