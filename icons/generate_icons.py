#!/usr/bin/env python3
"""
Generate PNG icons for the AgentMarKB Chrome extension.
Creates 16x16, 48x48, and 128x128 pixel icons.

Design: Bookmark/shield shape with deep blue background (#1e3a5f),
interconnected neural network nodes in electric teal (#00d4aa),
and prominent white "KB" text.
"""

import struct
import zlib
import math


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
            raw_data += bytes(pixels[idx:idx + 4])

    compressed = zlib.compress(raw_data, 9)
    idat = make_chunk(b'IDAT', compressed)

    # IEND chunk
    iend = make_chunk(b'IEND', b'')

    return header + ihdr + idat + iend


def blend_pixel(bg, fg, alpha):
    """Blend foreground color over background with given alpha (0.0-1.0)."""
    r = int(bg[0] * (1 - alpha) + fg[0] * alpha)
    g = int(bg[1] * (1 - alpha) + fg[1] * alpha)
    b = int(bg[2] * (1 - alpha) + fg[2] * alpha)
    a = max(bg[3], int(alpha * 255))
    return (min(255, r), min(255, g), min(255, b), min(255, a))


def distance(x1, y1, x2, y2):
    """Euclidean distance between two points."""
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def point_to_segment_distance(px, py, x1, y1, x2, y2):
    """Distance from point (px,py) to line segment (x1,y1)-(x2,y2)."""
    dx = x2 - x1
    dy = y2 - y1
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return distance(px, py, x1, y1)
    t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / length_sq))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return distance(px, py, proj_x, proj_y)


def create_kb_icon(size):
    """Create the AgentMarKB icon at the specified size."""
    pixels = []

    # Colors
    bg_color = (30, 58, 95, 255)       # Deep blue #1e3a5f
    teal = (0, 212, 170, 255)          # Electric teal #00d4aa
    white = (255, 255, 255, 255)       # White #ffffff
    transparent = (0, 0, 0, 0)
    # A slightly lighter blue for the inner glow area
    inner_blue = (35, 68, 110, 255)

    s = size  # shorthand

    # Bookmark/shield shape parameters
    # Rounded rectangle with a pointed notch at the bottom center
    corner_radius = max(2, s // 7)
    # The notch at the bottom
    notch_depth = max(2, s // 7)
    notch_half_width = max(3, s // 4)

    # --- Define neural network nodes (normalized 0..1 coordinates) ---
    # Positions designed to sit behind the KB text as a subtle background motif
    nodes_norm = [
        # Top area
        (0.20, 0.15),
        (0.50, 0.08),
        (0.80, 0.15),
        # Upper middle
        (0.12, 0.35),
        (0.88, 0.35),
        # Middle
        (0.15, 0.55),
        (0.50, 0.50),
        (0.85, 0.55),
        # Lower
        (0.25, 0.75),
        (0.50, 0.72),
        (0.75, 0.75),
        # Bottom
        (0.38, 0.88),
        (0.62, 0.88),
    ]

    # Edges connecting nodes (index pairs)
    edges = [
        (0, 1), (1, 2),
        (0, 3), (2, 4),
        (3, 5), (4, 7),
        (5, 6), (6, 7),
        (1, 6),
        (5, 8), (6, 9), (7, 10),
        (8, 9), (9, 10),
        (8, 11), (9, 11), (9, 12), (10, 12),
        (11, 12),
        (3, 6), (4, 6),
    ]

    # Scale nodes to pixel coordinates
    nodes = [(nx * s, ny * s) for (nx, ny) in nodes_norm]

    # Node and edge sizing
    node_radius = max(1.0, s * 0.035)
    edge_width = max(0.5, s * 0.015)

    # --- KB letter bitmaps (5x7 grid each) ---
    # K glyph on a 5x7 grid
    K_bitmap = [
        [1, 0, 0, 0, 1],
        [1, 0, 0, 1, 0],
        [1, 0, 1, 0, 0],
        [1, 1, 0, 0, 0],
        [1, 0, 1, 0, 0],
        [1, 0, 0, 1, 0],
        [1, 0, 0, 0, 1],
    ]

    # B glyph on a 5x7 grid
    B_bitmap = [
        [1, 1, 1, 1, 0],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 0],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 0],
    ]

    # Letter rendering parameters
    # KB occupies roughly the central area
    kb_total_grid_w = 5 + 1 + 5  # K(5) + gap(1) + B(5) = 11 columns
    kb_grid_h = 7

    # Scale: each grid cell is this many pixels
    cell_size = max(1.0, s * 0.065)
    kb_pixel_w = kb_total_grid_w * cell_size
    kb_pixel_h = kb_grid_h * cell_size

    # Center the KB text
    kb_offset_x = (s - kb_pixel_w) / 2.0
    kb_offset_y = (s - kb_pixel_h) / 2.0 - s * 0.02  # nudge up slightly

    def is_in_bookmark_shape(x, y):
        """Check if pixel (x,y) is inside the bookmark/shield shape."""
        # Basic bounds
        if x < 0 or x >= s or y < 0 or y >= s:
            return False

        # Top rounded rectangle part (extends to bottom minus notch area)
        body_bottom = s - 1

        # Check notch: below (s - notch_depth), the shape narrows to a V
        if y > s - notch_depth:
            # V-notch: center is at s/2
            # At y = s - notch_depth, full width
            # At y = s - 1, narrows to a point at center
            progress = (y - (s - notch_depth)) / max(1, notch_depth - 1)
            # Left boundary moves toward center
            left_bound = (s / 2.0 - notch_half_width) + progress * notch_half_width
            right_bound = (s / 2.0 + notch_half_width) - progress * notch_half_width
            if x < left_bound or x > right_bound:
                return False
            return True

        # For the main body (above notch), check rounded rectangle
        # Top-left corner
        if x < corner_radius and y < corner_radius:
            dx = corner_radius - x
            dy = corner_radius - y
            if dx * dx + dy * dy > corner_radius * corner_radius:
                return False

        # Top-right corner
        if x >= s - corner_radius and y < corner_radius:
            dx = x - (s - corner_radius - 1)
            dy = corner_radius - y
            if dx * dx + dy * dy > corner_radius * corner_radius:
                return False

        return True

    def get_bookmark_edge_alpha(x, y):
        """Return alpha for anti-aliased bookmark edge (1.0 inside, 0.0 outside)."""
        # Simple: return 1.0 if inside, 0.0 if outside
        # For smoother edges at larger sizes, check neighbors
        if size <= 16:
            return 1.0 if is_in_bookmark_shape(x, y) else 0.0

        # Sub-pixel sampling for anti-aliasing (2x2)
        count = 0
        for sy in range(2):
            for sx in range(2):
                if is_in_bookmark_shape(x + sx * 0.5, y + sy * 0.5):
                    count += 1
        return count / 4.0

    def is_in_kb_letter(x, y):
        """Check if pixel is part of the KB text. Returns alpha 0.0-1.0."""
        # Map pixel to grid coordinates for K
        gx_k = (x - kb_offset_x) / cell_size
        gy = (y - kb_offset_y) / cell_size

        if 0 <= gy < kb_grid_h:
            gi_y = int(gy)
            if gi_y >= kb_grid_h:
                gi_y = kb_grid_h - 1

            # K letter (columns 0..4)
            if 0 <= gx_k < 5:
                gi_x = int(gx_k)
                if gi_x >= 5:
                    gi_x = 4
                if K_bitmap[gi_y][gi_x]:
                    return 1.0

            # B letter (columns 6..10, i.e., offset by 6)
            gx_b = gx_k - 6
            if 0 <= gx_b < 5:
                gi_x = int(gx_b)
                if gi_x >= 5:
                    gi_x = 4
                if B_bitmap[gi_y][gi_x]:
                    return 1.0

        return 0.0

    def get_node_alpha(x, y):
        """Return alpha for neural network nodes at this pixel."""
        best = 0.0
        for (nx, ny) in nodes:
            d = distance(x, y, nx, ny)
            if d < node_radius:
                # Smooth falloff
                alpha = 1.0 - (d / node_radius)
                best = max(best, alpha)
            elif d < node_radius + 1.0:
                # Anti-alias edge
                alpha = (node_radius + 1.0 - d) * 0.5
                best = max(best, alpha)
        return min(1.0, best)

    def get_edge_alpha(x, y):
        """Return alpha for neural network edges at this pixel."""
        best = 0.0
        for (i, j) in edges:
            n1 = nodes[i]
            n2 = nodes[j]
            d = point_to_segment_distance(x, y, n1[0], n1[1], n2[0], n2[1])
            if d < edge_width:
                alpha = 0.4 * (1.0 - d / edge_width)
                best = max(best, alpha)
            elif d < edge_width + 0.8:
                alpha = 0.2 * (edge_width + 0.8 - d) / 0.8
                best = max(best, alpha)
        return min(1.0, best)

    # --- Render each pixel ---
    for y in range(s):
        for x in range(s):
            if not is_in_bookmark_shape(x, y):
                # Check anti-aliased edge
                edge_alpha = get_bookmark_edge_alpha(x, y)
                if edge_alpha > 0:
                    # Partially inside - blend bg with transparent
                    pixel = (bg_color[0], bg_color[1], bg_color[2],
                             int(edge_alpha * 255))
                    pixels.extend(pixel)
                else:
                    pixels.extend(transparent)
                continue

            # Start with background
            current = bg_color

            # Layer 1: Neural network edges (subtle, behind everything)
            edge_a = get_edge_alpha(x, y)
            if edge_a > 0:
                current = blend_pixel(current, teal, edge_a * 0.35)

            # Layer 2: Neural network nodes (small dots)
            node_a = get_node_alpha(x, y)
            if node_a > 0:
                current = blend_pixel(current, teal, node_a * 0.6)

            # Layer 3: KB text on top (white, fully opaque where present)
            kb_a = is_in_kb_letter(x, y)
            if kb_a > 0:
                current = blend_pixel(current, white, kb_a * 0.95)

            pixels.extend(current)

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
