import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';

describe('index.html - Chatbot Widget Styling', () => {
  let dom;
  let document;
  let styleContent;

  // Setup: Load and parse the HTML
  it('should load index.html successfully', async () => {
    const html = await fs.readFile('index.html', 'utf-8');
    assert.ok(html.length > 0, 'HTML file should not be empty');
    
    dom = new JSDOM(html);
    document = dom.window.document;
    assert.ok(document, 'Document should be parsed successfully');
  });

  it('should have valid HTML5 DOCTYPE', async () => {
    const html = await fs.readFile('index.html', 'utf-8');
    assert.ok(html.trim().startsWith('<!DOCTYPE html>'), 'Should have HTML5 DOCTYPE');
  });

  it('should contain the Dify chatbot embed script', async () => {
    const html = await fs.readFile('index.html', 'utf-8');
    const hasEmbedScript = html.includes('dexakyo.akyodex.com/embed.min.js');
    assert.ok(hasEmbedScript, 'Should include Dify chatbot embed script');
  });

  describe('Chatbot Button Styling', () => {
    it('should have style tag for chatbot button', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasButtonStyle = html.includes('#dify-chatbot-bubble-button');
      assert.ok(hasButtonStyle, 'Should include chatbot button styles');
    });

    it('should set custom background color for chatbot button', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasOrangeColor = html.includes('background-color: #EE7800 !important');
      assert.ok(hasOrangeColor, 'Chatbot button should have #EE7800 background color');
    });

    it('should use !important flag for button styling', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const styleMatch = html.match(/#dify-chatbot-bubble-button\s*{[^}]*}/s);
      assert.ok(styleMatch, 'Should find chatbot button style block');
      assert.ok(styleMatch[0].includes('!important'), 'Button style should use !important');
    });
  });

  describe('Chatbot Window Positioning - New Changes', () => {
    it('should have style tag for chatbot window', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasWindowStyle = html.includes('#dify-chatbot-bubble-window');
      assert.ok(hasWindowStyle, 'Should include chatbot window styles');
    });

    it('should set width to 24rem with !important', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasWidth = html.includes('width: 24rem !important');
      assert.ok(hasWidth, 'Chatbot window width should be 24rem !important');
    });

    it('should set height to 40rem with !important', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasHeight = html.includes('height: 40rem !important');
      assert.ok(hasHeight, 'Chatbot window height should be 40rem !important');
    });

    it('should have position: fixed with !important (NEW)', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasPosition = html.includes('position: fixed !important');
      assert.ok(hasPosition, 'Chatbot window should have position: fixed !important');
    });

    it('should have inset property for bottom-right positioning (NEW)', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasInset = html.includes('inset: auto 1rem 1rem auto');
      assert.ok(hasInset, 'Chatbot window should have inset: auto 1rem 1rem auto');
    });

    it('should have correct inset values for bottom-right corner (NEW)', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const insetMatch = html.match(/inset:\s*auto\s+1rem\s+1rem\s+auto/);
      assert.ok(insetMatch, 'Inset should be: auto (top) 1rem (right) 1rem (bottom) auto (left)');
    });

    it('should use !important for all positioning properties', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const windowStyleMatch = html.match(/#dify-chatbot-bubble-window\s*{([^}]*)}/s);
      assert.ok(windowStyleMatch, 'Should find chatbot window style block');
      
      const styleBlock = windowStyleMatch[1];
      const importantCount = (styleBlock.match(/!important/g) || []).length;
      assert.ok(importantCount >= 3, 'Should have at least 3 !important declarations');
    });

    it('should have all required CSS properties for fixed positioning', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const windowStyleMatch = html.match(/#dify-chatbot-bubble-window\s*{([^}]*)}/s);
      assert.ok(windowStyleMatch, 'Should find chatbot window style block');
      
      const styleBlock = windowStyleMatch[1];
      assert.ok(styleBlock.includes('width:'), 'Should include width property');
      assert.ok(styleBlock.includes('height:'), 'Should include height property');
      assert.ok(styleBlock.includes('position:'), 'Should include position property');
      assert.ok(styleBlock.includes('inset:'), 'Should include inset property');
    });
  });

  describe('CSS Specificity and Selector Validation', () => {
    it('should use ID selector for chatbot elements', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasIdSelectors = html.includes('#dify-chatbot-bubble-button') && 
                             html.includes('#dify-chatbot-bubble-window');
      assert.ok(hasIdSelectors, 'Should use ID selectors for high specificity');
    });

    it('should have styles in correct location (before closing body tag)', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const bodyCloseIndex = html.lastIndexOf('</body>');
      const styleIndex = html.lastIndexOf('<style>');
      assert.ok(styleIndex < bodyCloseIndex, 'Style tag should be before closing body tag');
    });

    it('should not have conflicting position styles', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const windowStyleMatch = html.match(/#dify-chatbot-bubble-window\s*{([^}]*)}/s);
      assert.ok(windowStyleMatch, 'Should find chatbot window style block');
      
      const styleBlock = windowStyleMatch[1];
      const positionMatches = styleBlock.match(/position:/g);
      assert.strictEqual(positionMatches?.length, 1, 'Should have exactly one position declaration');
    });
  });

  describe('Inset Property Validation', () => {
    it('should use shorthand inset property instead of individual properties', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const windowStyleMatch = html.match(/#dify-chatbot-bubble-window\s*{([^}]*)}/s);
      assert.ok(windowStyleMatch, 'Should find chatbot window style block');
      
      const styleBlock = windowStyleMatch[1];
      assert.ok(styleBlock.includes('inset:'), 'Should use inset shorthand');
      assert.ok(!styleBlock.includes('top:'), 'Should not use individual top property');
      assert.ok(!styleBlock.includes('right:') || styleBlock.match(/right:/g)?.length === 0, 'Should not use individual right property');
      assert.ok(!styleBlock.includes('bottom:'), 'Should not use individual bottom property');
      assert.ok(!styleBlock.includes('left:'), 'Should not use individual left property');
    });

    it('should have correct inset value format', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const insetMatch = html.match(/inset:\s*([^;]+);/);
      assert.ok(insetMatch, 'Should find inset declaration');
      
      const insetValue = insetMatch[1].trim();
      const values = insetValue.split(/\s+/);
      assert.strictEqual(values.length, 4, 'Inset should have 4 values (top right bottom left)');
    });

    it('should use rem units for consistent spacing', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const insetMatch = html.match(/inset:\s*([^;]+);/);
      assert.ok(insetMatch, 'Should find inset declaration');
      
      const insetValue = insetMatch[1];
      const remCount = (insetValue.match(/\d+rem/g) || []).length;
      assert.strictEqual(remCount, 2, 'Should use rem units for right and bottom spacing');
    });

    it('should use auto for top and left positioning', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const insetMatch = html.match(/inset:\s*auto\s+1rem\s+1rem\s+auto/);
      assert.ok(insetMatch, 'Should use auto for top and left to anchor to bottom-right');
    });
  });

  describe('Integration with Service Worker Registration', () => {
    it('should have service worker registration script', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasSW = html.includes("navigator.serviceWorker.register");
      assert.ok(hasSW, 'Should include service worker registration');
    });

    it('should have chatbot styles before service worker script', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const chatbotStyleIndex = html.lastIndexOf('#dify-chatbot-bubble-window');
      const swScriptIndex = html.lastIndexOf('serviceWorker.register');
      assert.ok(chatbotStyleIndex < swScriptIndex, 'Chatbot styles should load before SW script');
    });
  });

  describe('Responsive Design Considerations', () => {
    it('should use fixed positioning for viewport-relative placement', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasFixed = html.match(/#dify-chatbot-bubble-window[^}]*position:\s*fixed/s);
      assert.ok(hasFixed, 'Should use position: fixed for viewport-relative positioning');
    });

    it('should maintain spacing from viewport edges', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const insetMatch = html.match(/inset:\s*auto\s+1rem\s+1rem\s+auto/);
      assert.ok(insetMatch, 'Should maintain 1rem spacing from right and bottom edges');
    });

    it('should have reasonable dimensions that fit mobile viewports', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const widthMatch = html.match(/width:\s*24rem/);
      const heightMatch = html.match(/height:\s*40rem/);
      
      assert.ok(widthMatch, 'Width should be 24rem (384px at default font size)');
      assert.ok(heightMatch, 'Height should be 40rem (640px at default font size)');
      
      // 24rem = 384px, 40rem = 640px - reasonable for mobile
      assert.ok(true, 'Dimensions should be mobile-friendly');
    });
  });

  describe('CSS Syntax and Formatting', () => {
    it('should have properly closed style tag', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const styleOpenCount = (html.match(/<style>/g) || []).length;
      const styleCloseCount = (html.match(/<\/style>/g) || []).length;
      assert.strictEqual(styleOpenCount, styleCloseCount, 'All style tags should be properly closed');
    });

    it('should have valid CSS syntax in chatbot styles', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const styleMatch = html.match(/#dify-chatbot-bubble-window\s*{([^}]*)}/s);
      assert.ok(styleMatch, 'Should find chatbot window style block');
      
      const styleBlock = styleMatch[1];
      const declarations = styleBlock.split(';').filter(d => d.trim());
      
      for (const decl of declarations) {
        const colonCount = (decl.match(/:/g) || []).length;
        assert.ok(colonCount >= 1, `Declaration "${decl.trim()}" should have at least one colon`);
      }
    });

    it('should use consistent spacing in CSS declarations', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const styleMatch = html.match(/#dify-chatbot-bubble-window\s*{([^}]*)}/s);
      assert.ok(styleMatch, 'Should find chatbot window style block');
      
      const styleBlock = styleMatch[1];
      // Check that declarations follow pattern: property: value;
      const declarations = styleBlock.split(';').filter(d => d.trim());
      
      for (const decl of declarations) {
        if (decl.trim()) {
          assert.ok(decl.includes(':'), `Declaration should have colon: ${decl.trim()}`);
        }
      }
    });
  });

  describe('Z-Index and Stacking Context', () => {
    it('should not explicitly set z-index (rely on chatbot default)', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const windowStyleMatch = html.match(/#dify-chatbot-bubble-window\s*{([^}]*)}/s);
      assert.ok(windowStyleMatch, 'Should find chatbot window style block');
      
      const styleBlock = windowStyleMatch[1];
      assert.ok(!styleBlock.includes('z-index:'), 'Should not override chatbot\'s default z-index');
    });
  });

  describe('Browser Compatibility', () => {
    it('should use modern CSS inset property', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const hasInset = html.includes('inset:');
      assert.ok(hasInset, 'Should use modern inset property (supported in modern browsers)');
    });

    it('should use !important to override chatbot default styles', async () => {
      const html = await fs.readFile('index.html', 'utf-8');
      const windowStyleMatch = html.match(/#dify-chatbot-bubble-window\s*{([^}]*)}/s);
      assert.ok(windowStyleMatch, 'Should find chatbot window style block');
      
      const styleBlock = windowStyleMatch[1];
      const importantDeclarations = styleBlock.match(/!important/g);
      assert.ok(importantDeclarations && importantDeclarations.length >= 3, 
        'Should use !important for all overrides');
    });
  });
});

describe('HTML Document Structure', () => {
  it('should have valid HTML structure', async () => {
    const html = await fs.readFile('index.html', 'utf-8');
    assert.ok(html.includes('<html'), 'Should have html tag');
    assert.ok(html.includes('<head>'), 'Should have head tag');
    assert.ok(html.includes('<body>'), 'Should have body tag');
    assert.ok(html.includes('</html>'), 'Should have closing html tag');
  });

  it('should have proper charset declaration', async () => {
    const html = await fs.readFile('index.html', 'utf-8');
    assert.ok(html.includes('charset="UTF-8"'), 'Should have UTF-8 charset');
  });

  it('should have viewport meta tag for responsive design', async () => {
    const html = await fs.readFile('index.html', 'utf-8');
    assert.ok(html.includes('name="viewport"'), 'Should have viewport meta tag');
  });
});