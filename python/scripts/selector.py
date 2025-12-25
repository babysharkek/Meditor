import cv2
import sys

MAX_WIDTH = 1200
MAX_HEIGHT = 800

def main():
    if len(sys.argv) < 2:
        print("Usage: python selector.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    original = cv2.imread(image_path)
    
    if original is None:
        print(f"Could not load image: {image_path}")
        sys.exit(1)
    
    orig_h, orig_w = original.shape[:2]
    
    # scale down if too big
    scale = min(MAX_WIDTH / orig_w, MAX_HEIGHT / orig_h, 1.0)
    if scale < 1.0:
        new_w, new_h = int(orig_w * scale), int(orig_h * scale)
        img = cv2.resize(original, (new_w, new_h))
        print(f"📐 Scaled {orig_w}x{orig_h} → {new_w}x{new_h} (scale: {scale:.2f})")
    else:
        img = original
        scale = 1.0
    
    points = []
    
    def to_original(x, y):
        return int(x / scale), int(y / scale)
    
    def mouse_callback(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            orig_x, orig_y = to_original(x, y)
            points.append((orig_x, orig_y))
            print(f"\n📍 Point {len(points)}: X={orig_x}, Y={orig_y}")
            cv2.circle(param['display'], (x, y), 5, (0, 255, 0), -1)
            cv2.putText(param['display'], f"({orig_x},{orig_y})", (x+10, y), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            cv2.imshow("Image Selector", param['display'])
    
    display = img.copy()
    cv2.namedWindow("Image Selector")
    cv2.setMouseCallback("Image Selector", mouse_callback, {'display': display})
    
    print("\n=== SAM2 Coordinate Selector ===")
    print(f"Original size: {orig_w}x{orig_h}")
    print("Left-click: Add point prompt")
    print("Press 'b': Draw bounding box")
    print("Press 'r': Reset")
    print("Press 'q': Quit\n")
    
    while True:
        cv2.imshow("Image Selector", display)
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('q'):
            break
        elif key == ord('b'):
            print("\nDraw a box (click and drag), then press ENTER or SPACE")
            roi = cv2.selectROI("Image Selector", img, fromCenter=False, showCrosshair=True)
            if roi != (0, 0, 0, 0):
                x, y, w, h = roi
                # convert to original coords
                x_min, y_min = to_original(x, y)
                x_max, y_max = to_original(x + w, y + h)
                print(f"\n📦 Box Prompts:")
                print(f"   X Min: {x_min}")
                print(f"   Y Min: {y_min}")
                print(f"   X Max: {x_max}")
                print(f"   Y Max: {y_max}")
                # redraw
                display = img.copy()
                cv2.rectangle(display, (x, y), (x + w, y + h), (255, 0, 0), 2)
                for orig_px, orig_py in points:
                    px, py = int(orig_px * scale), int(orig_py * scale)
                    cv2.circle(display, (px, py), 5, (0, 255, 0), -1)
        elif key == ord('r'):
            display = img.copy()
            points.clear()
            print("\n🔄 Reset")
    
    cv2.destroyAllWindows()
    
    if points:
        print("\n=== Final Point Prompts ===")
        for i, (x, y) in enumerate(points, 1):
            print(f"Point {i}: X={x}, Y={y}")

if __name__ == "__main__":
    main()
