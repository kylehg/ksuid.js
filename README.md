# ksuid.js
Universal JavaScript K-sortable UUIDs (KSUIDs)

**NB: This is currently a personal-interest project and not meant for broader use, certainly not in a production environment.**

## TODO

- [x] basic KSUID, segment version
- [x] KSUID2 with ms precision
- [x] basic npm package setup
- [x] basic test setup
- [ ] Framework for tests with browser (crypto) vs. browser (Math.random()) vs. Node
- [ ] Test cases:
  - [ ] General sorting
- [ ] Enhancements (with tests)
  - [ ] Bounds checking for date
  - [ ] Bounds checking for random part
  - [ ] Helpers (see [ksuid](https://github.com/novemberborn/ksuid/blob/master/index.d.ts) for inspo)
    - [ ] Default string conversion
    - [ ] Default comparison
    - [ ] Init from strings
    - [ ] Init from Date + buffer
    - [ ] Init from pure buffer
- [ ] Perf comparison with ksuid package for Node
