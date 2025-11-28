from PIL import Image, ImageDraw, ImageFont
import os

# Create a simple but professional logo for 2tick.kz
width, height = 400, 400
img = Image.new('RGBA', (width, height), (255, 255, 255, 0))
draw = ImageDraw.Draw(img)

# Draw two checkmarks (ticks) in blue
# Color: #3b82f6 (blue-500)
blue = (59, 130, 246, 255)

# First checkmark (larger)
tick1_points = [
    (80, 180), (120, 220), (200, 100)
]
draw.line(tick1_points, fill=blue, width=30, joint='curve')

# Second checkmark (overlapping, slightly offset)
tick2_points = [
    (150, 200), (190, 240), (270, 120)
]
draw.line(tick2_points, fill=blue, width=30, joint='curve')

# Save the logo
img.save('/app/backend/logo.png', 'PNG')
print("✅ Logo created successfully at /app/backend/logo.png")
