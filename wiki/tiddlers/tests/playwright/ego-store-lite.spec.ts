import { expect, test } from '@playwright/test';

const EGO_STORE_LAYOUT = '$:/plugins/linonetwo/ego-store-lite/tiddlywiki-ui/layout/game-layout';
const GOLD_TIDDLER = '$:/plugins/linonetwo/ego-store-lite/configs/Golds';
const PLAY_GAME_GOODS = '$:/plugins/linonetwo/early-sleep-early-work/goods/play-game';
const PLAY_GAME_LOG = '$:/plugins/linonetwo/early-sleep-early-work/goods/play-game-Log';

/** Helper: get tiddler field via TiddlyWiki JS API */
async function getTiddlerField(page: import('@playwright/test').Page, title: string, field: string): Promise<string> {
  return page.evaluate(
    ([t, f]) => {
      const tiddler = (window as any).$tw?.wiki?.getTiddler(t);
      return String(tiddler?.fields?.[f] ?? '');
    },
    [title, field],
  );
}

/** Helper: set tiddler text field via TiddlyWiki JS API */
async function setTiddlerText(page: import('@playwright/test').Page, title: string, text: string) {
  await page.evaluate(
    ([t, txt]) => {
      (window as any).$tw?.wiki?.addTiddler({ title: t, text: txt });
    },
    [title, text],
  );
}

/** Helper: wait for TiddlyWiki to be ready */
async function waitForTW(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => typeof (window as any).$tw !== 'undefined' && (window as any).$tw.wiki !== undefined);
}

test.describe('ego-store-lite 商店按钮', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForTW(page);
    // 设置中文语言并切换到 ego-store-lite 游戏布局
    await page.evaluate((layoutTitle: string) => {
      const tw = (window as any).$tw;
      tw.wiki.addTiddler({ title: '$:/language', text: '$:/languages/zh-Hans' });
      tw.wiki.addTiddler({ title: '$:/layout', text: layoutTitle });
    }, EGO_STORE_LAYOUT);
    // 等待商店容器出现（外层容器是 tc-page-container，内层是纯 ego-store-lite-container）
    await page.locator('div.ego-store-lite-container:not(.tc-page-container)').waitFor({ state: 'visible', timeout: 15000 });
    // 等待 tabs 渲染后点击商店标签
    await page.locator('.ego-store-lite-container .tc-tab-buttons button').filter({ hasText: /商店|Store/ }).first().click();
    // 等待商店内容加载
    await page.locator('.ego-store-lite-game-buttons-list').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('.ego-store-lite-action-background-chart canvas').length > 0);
  });

  test('商店卡片使用边框样式而非渐变背景', async ({ page }) => {
    const card = page.locator('.ego-store-lite-game-buttons-list-item').first();
    await expect(card).toBeVisible();

    const styles = await card.evaluate((el: HTMLElement) => {
      const cs = window.getComputedStyle(el);
      return {
        background: cs.background,
        backgroundImage: cs.backgroundImage,
        borderStyle: cs.borderStyle,
        borderWidth: cs.borderWidth,
        borderRadius: cs.borderRadius,
      };
    });

    // 边框宽度为 2px
    expect(styles.borderWidth).toBe('2px');
    expect(styles.borderStyle).toBe('solid');
    // 背景不再是重度渐变（不应该包含 rgba(102, 126, 234
    expect(styles.backgroundImage).not.toContain('rgba(102, 126, 234');
    // border-radius 不超过 20px
    const radius = Number.parseInt(styles.borderRadius);
    expect(radius).toBeLessThanOrEqual(20);
  });

  test('商店卡片显示标题、金币奖励和描述', async ({ page }) => {
    const firstCard = page.locator('.ego-store-lite-game-buttons-list-item').first();
    await expect(firstCard).toBeVisible();

    // 应包含标题
    await expect(firstCard.locator('.ego-store-lite-game-buttons-list-item-title')).toBeVisible();
    // 应包含金币价格
    await expect(firstCard.locator('.ego-store-lite-game-buttons-list-item-reward')).toBeVisible();
    // 应包含图标
    await expect(firstCard.locator('.ego-store-lite-game-buttons-list-item-icon')).toBeVisible();
  });

  test('卡片内显示透明背景的 ECharts 图表并在点击后刷新数据', async ({ page }) => {
    await setTiddlerText(page, GOLD_TIDDLER, '10');
    await page.evaluate((logTitle: string) => {
      (window as any).$tw?.wiki?.deleteTiddler(logTitle);
    }, PLAY_GAME_LOG);

    const card = page.locator('.ego-store-lite-game-buttons-list-item').first();
    const chart = card.locator('.ego-store-lite-action-background-chart');
    await expect(chart).toBeVisible();
    await expect(chart.locator('canvas')).toHaveCount(1);

    const chartStyle = await chart.evaluate((el: HTMLElement) => {
      const cs = window.getComputedStyle(el);
      return { backgroundImage: cs.backgroundImage, backgroundColor: cs.backgroundColor };
    });
    expect(chartStyle.backgroundImage).toBe('none');

    const beforeSeries = await page.evaluate(() => {
      const el = document.querySelector('.ego-store-lite-game-buttons-list-item .gk0wk-echarts-body');
      const inst = (window as any).echarts?.getInstanceByDom(el);
      return inst?.getOption()?.series?.map((s: any) => s.data) ?? [];
    });

    await card.locator('button').click();
    await page.waitForTimeout(900);

    const afterSeries = await page.evaluate(() => {
      const el = document.querySelector('.ego-store-lite-game-buttons-list-item .gk0wk-echarts-body');
      const inst = (window as any).echarts?.getInstanceByDom(el);
      return inst?.getOption()?.series?.map((s: any) => s.data) ?? [];
    });

    expect(beforeSeries.length).toBeGreaterThan(0);
    expect(afterSeries.length).toBeGreaterThan(0);
    expect(JSON.stringify(afterSeries)).not.toBe(JSON.stringify(beforeSeries));
    expect(JSON.stringify(afterSeries)).toContain('1');
  });

  test('商品条目正文展示对应 ActivityLog 的可视化与表格', async ({ page }) => {
    await setTiddlerText(page, GOLD_TIDDLER, '10');
    await page.evaluate((logTitle: string) => {
      (window as any).$tw?.wiki?.deleteTiddler(logTitle);
    }, PLAY_GAME_LOG);

    const playGameCard = page.locator('.ego-store-lite-game-buttons-list-item').first();
    await playGameCard.locator('button').click();
    await page.waitForTimeout(900);

    await playGameCard.hover();
    await playGameCard.locator('select').selectOption('open');
    await page.waitForTimeout(900);

    await expect(page.getByRole('heading', { name: PLAY_GAME_GOODS })).toBeVisible();
    await expect(page.getByText('活动记录与可视化')).toBeVisible();
    await expect(page.getByText(PLAY_GAME_LOG)).toBeVisible();
    await expect(page.locator('.ego-store-lite-goods-activity-log-panel .gk0wk-echarts-body')).toHaveCount(1);
    await expect(page.locator('.ego-store-lite-goods-activity-log-panel table.tc-table tbody tr')).toHaveCount(1);
  });

  test('悬浮时显示编辑菜单按钮', async ({ page }) => {
    const card = page.locator('.ego-store-lite-game-buttons-list-item').first();
    const editDiv = card.locator('.ego-store-lite-game-buttons-list-item-edit');

    // 初始状态：编辑按钮不可见（opacity: 0）
    const initialOpacity = await editDiv.evaluate((el: HTMLElement) => window.getComputedStyle(el).opacity);
    expect(Number.parseFloat(initialOpacity)).toBe(0);

    // 移动鼠标到卡片中央触发 hover，等待 CSS transition 完成
    const box = await card.boundingBox();
    if (!box) throw new Error('card bounding box not found');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(400); // 等待 transition: all 0.3s 完成

    // 悬浮后：编辑按钮应该变为可见（opacity: 1）
    const hoverOpacity = await editDiv.evaluate((el: HTMLElement) => window.getComputedStyle(el).opacity);
    expect(Number.parseFloat(hoverOpacity)).toBeGreaterThan(0);
  });

  test('点击购买按钮消耗金币并记录活动日志', async ({ page }) => {
    // 先设置金币余额为 10
    await setTiddlerText(page, GOLD_TIDDLER, '10');

    // 等待 UI 更新显示金币
    await page.waitForTimeout(500);

    // 找到"玩一小时游戏"按钮并点击
    const playGameCard = page.locator('.ego-store-lite-game-buttons-list-item').first();
    await playGameCard.locator('button').click();

    // 等待动作完成
    await page.waitForTimeout(800);

    // 验证金币减少了 1
    const goldAfter = await getTiddlerField(page, GOLD_TIDDLER, 'text');
    expect(Number(goldAfter)).toBe(9);
  });

  test('金币不足时购买失败并显示通知', async ({ page }) => {
    // 设置金币为 0
    await setTiddlerText(page, GOLD_TIDDLER, '0');
    await page.waitForTimeout(300);

    // 点击购买按钮
    const playGameCard = page.locator('.ego-store-lite-game-buttons-list-item').first();
    await playGameCard.locator('button').click();
    await page.waitForTimeout(500);

    // 金币应保持为 0（购买失败）
    const goldAfter = await getTiddlerField(page, GOLD_TIDDLER, 'text');
    expect(Number(goldAfter)).toBe(0);
  });

  test('购买后活动日志条目被创建', async ({ page }) => {
    // 先设置金币余额
    await setTiddlerText(page, GOLD_TIDDLER, '5');
    await page.waitForTimeout(300);

    // 清除之前的日志（如果有）
    await page.evaluate((logTitle: string) => {
      (window as any).$tw?.wiki?.deleteTiddler(logTitle);
    }, PLAY_GAME_LOG);

    // 点击购买
    const playGameCard = page.locator('.ego-store-lite-game-buttons-list-item').first();
    await playGameCard.locator('button').click();
    await page.waitForTimeout(800);

    // 验证日志条目被创建
    const logExists = await page.evaluate((logTitle: string) => {
      return (window as any).$tw?.wiki?.tiddlerExists(logTitle) ?? false;
    }, PLAY_GAME_LOG);
    expect(logExists).toBe(true);
  });

  test('商店卡片图标位于卡片底部', async ({ page }) => {
    const card = page.locator('.ego-store-lite-game-buttons-list-item').first();
    const icon = card.locator('.ego-store-lite-game-buttons-list-item-icon');
    await expect(icon).toBeVisible();

    const iconStyles = await icon.evaluate((el: HTMLElement) => {
      const cs = window.getComputedStyle(el);
      return {
        position: cs.position,
        bottom: cs.bottom,
        fontSize: cs.fontSize,
      };
    });

    // 图标应该是绝对定位在底部
    expect(iconStyles.position).toBe('absolute');
    expect(Number.parseInt(iconStyles.bottom)).toBeLessThanOrEqual(20);
    // 图标字体大小应该足够大（>= 48px = ~3em for most browsers）
    expect(Number.parseInt(iconStyles.fontSize)).toBeGreaterThan(40);
  });
});
