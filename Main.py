import pygame
import sys
import random


pygame.init()

# تنظیمات
WIDTH, HEIGHT = 600, 600
ROWS, COLS = 10, 10
CELL_SIZE = WIDTH // COLS

screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("شطرنج‌العرفا")

# رنگ‌ها
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
LIGHT = (230, 230, 250)
DARK = (180, 180, 220)
PLAYER_COLOR = (255, 0, 0)

# فونت
font = pygame.font.SysFont("tahoma", 18)


#تاس
def roll_dice():
    return random.randint(1, 6)


# موقعیت بازیکن
player_pos = 1

def draw_board():
    screen.fill(WHITE)
    num = 1
    for row in range(ROWS):
        for col in range(COLS):
            real_col = col if row % 2 == 0 else COLS - 1 - col
            x = real_col * CELL_SIZE
            y = (ROWS - 1 - row) * CELL_SIZE
            color = LIGHT if (row + col) % 2 == 0 else DARK
            pygame.draw.rect(screen, color, (x, y, CELL_SIZE, CELL_SIZE))
            text = font.render(str(num), True, BLACK)
            text_rect = text.get_rect(center=(x + CELL_SIZE // 2, y + CELL_SIZE // 2))
            screen.blit(text, text_rect)
            num += 1

def draw_dice(value):
    text = font.render(f"تاس: {value}", True, (0, 0, 128))
    screen.blit(text, (10, 10))

def draw_player(pos):
    row = (pos - 1) // COLS
    col = (pos - 1) % COLS
    real_col = col if row % 2 == 0 else COLS - 1 - col
    x = real_col * CELL_SIZE + CELL_SIZE // 2
    y = (ROWS - 1 - row) * CELL_SIZE + CELL_SIZE // 2
    pygame.draw.circle(screen, PLAYER_COLOR, (x, y), CELL_SIZE // 4)

dice_value = 0  # عدد آخر تاس

# حلقه بازی
clock = pygame.time.Clock()
running = True

while running:
    draw_board()
    draw_player(player_pos)
    draw_dice(dice_value)

    pygame.display.update()

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
       
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                dice_value = roll_dice()
                if player_pos + dice_value <= 100:
                    player_pos += dice_value

        # حرکت بازیکن با کلیدها
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_RIGHT and player_pos < 100:
                player_pos += 1
            if event.key == pygame.K_LEFT and player_pos > 1:
                player_pos -= 1

    clock.tick(10)

pygame.quit()
sys.exit()
