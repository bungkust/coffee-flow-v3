# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: brew-calculation-and-log.spec.ts >> Brewing Calculation & Unsaved Log Integration Test Suite >> Scenario 4: Complete Brew Timer & Direct "Back to Home" Persistence Audit
- Location: tests/e2e/specs/brew-calculation-and-log.spec.ts:174:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - banner [ref=f1e4]:
    - generic [ref=f1e5]:
      - generic [ref=f1e6]: Brewing Method
      - heading "V60 - Kurasu Japanese Iced Pour-Over" [level=1] [ref=f1e7]
  - generic [ref=f1e8]:
    - generic [ref=f1e10]:
      - generic [ref=f1e12]: emoji_events
      - heading "Done!" [level=2] [ref=f1e14]
      - heading "Enjoy your coffee" [level=3] [ref=f1e15]
      - paragraph [ref=f1e16]: Great job! Your brew is complete and ready to serve.
      - generic [ref=f1e18]:
        - generic [ref=f1e19]: Total Water
        - generic [ref=f1e20]:
          - text: 220ml
          - generic [ref=f1e21]: / 220ml
    - generic [ref=f1e24]:
      - heading "Previous Steps" [level=3] [ref=f1e25]
      - generic [ref=f1e26]:
        - generic [ref=f1e27]: check
        - generic [ref=f1e29]:
          - heading "Stir & Serve over Fresh Ice" [level=4] [ref=f1e30]
          - paragraph [ref=f1e31]: Completed at 2:21
        - generic [ref=f1e32]: Done
  - generic [ref=f1e33]:
    - button "Finish & Log Brew" [ref=f1e34] [cursor=pointer]:
      - generic [ref=f1e35]: assignment
    - button "Back to Homepage" [ref=f1e37] [cursor=pointer]
```