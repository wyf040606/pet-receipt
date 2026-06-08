/**
 * 猫咪小票 v2.0 — 核心引擎
 * SplitText · 卡片渲染 · 3D卡夹转场 · FormManager CRUD · 时光轴 · 热敏小票
 */

/* ===================================================================
   模块 A: SplitText 逐字拆分引擎
   =================================================================== */
function splitText(el, opts = {}) {
  const text = el.textContent || '';
  el.innerHTML = '';
  const words = text.split(/(\s+)/).filter(Boolean);
  let charIndex = 0;

  words.forEach((segment) => {
    if (/^\s+$/.test(segment)) {
      el.appendChild(document.createTextNode(segment));
      return;
    }
    const wordSpan = document.createElement('span');
    wordSpan.className = 'receipt-word';

    if (opts.perWord) {
      const charSpan = document.createElement('span');
      charSpan.className = 'receipt-char';
      charSpan.style.setProperty('--i', charIndex);
      charSpan.textContent = segment;
      wordSpan.appendChild(charSpan);
      charIndex++;
    } else {
      for (const char of segment) {
        const charSpan = document.createElement('span');
        charSpan.className = 'receipt-char';
        charSpan.style.setProperty('--i', charIndex);
        charSpan.textContent = char;
        wordSpan.appendChild(charSpan);
        charIndex++;
      }
    }
    el.appendChild(wordSpan);
  });

  return {
    totalChars: charIndex,
    words: el.querySelectorAll('.receipt-word'),
    chars: el.querySelectorAll('.receipt-char')
  };
}

function animateSequence(sequence) {
  let cumulativeTime = 0;
  const CHAR_STEP = 30;

  sequence.forEach((item) => {
    const { el, mode, baseDelay } = item;
    if (!el) return;
    const result = splitText(el, { perWord: mode === 'words' });
    const startDelay = baseDelay != null ? baseDelay : cumulativeTime;

    if (mode === 'words') {
      result.words.forEach((word, wi) => {
        setTimeout(() => {
          word.classList.add('word-visible');
          word.querySelectorAll('.receipt-char').forEach(char => char.classList.add('animated'));
        }, startDelay + wi * 80);
      });
      cumulativeTime = startDelay + result.words.length * 80;
    } else {
      result.chars.forEach((char, ci) => {
        setTimeout(() => {
          const word = char.closest('.receipt-word');
          if (word) word.classList.add('word-visible');
          char.classList.add('animated');
        }, startDelay + ci * CHAR_STEP);
      });
      cumulativeTime = startDelay + result.totalChars * CHAR_STEP;
    }
    cumulativeTime = cumulativeTime * 0.6; // 40% 重叠
  });
}

/* ===================================================================
   模块 B: 品种筛选系统
   =================================================================== */
function initBreedSelector(container, type, onSelect) {
  const searchInput = container.querySelector('.breed-search');
  const dropdown = container.querySelector('.breed-dropdown');
  if (!searchInput || !dropdown) return;

  let currentType = type || 'cat';
  let highlightedIndex = -1;

  function renderDropdown(items) {
    dropdown.innerHTML = '';
    highlightedIndex = -1;

    if (items.length === 0) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'custom-breed-input';
      input.placeholder = '手动输入具体品种...';
      input.addEventListener('click', e => e.stopPropagation());
      input.addEventListener('input', e => {
        if (typeof onSelect === 'function') onSelect(e.target.value, true);
      });
      dropdown.appendChild(input);
    } else {
      items.forEach((breed, i) => {
        const div = document.createElement('div');
        div.className = 'breed-option';
        div.textContent = breed;
        div.addEventListener('click', e => {
          e.stopPropagation();
          searchInput.value = breed;
          dropdown.classList.remove('open');
          if (typeof onSelect === 'function') onSelect(breed, false);
        });
        dropdown.appendChild(div);
      });
      const otherDiv = document.createElement('div');
      otherDiv.className = 'breed-option';
      otherDiv.textContent = '✨ 其他（手动输入）';
      otherDiv.style.color = 'var(--ink-light)';
      otherDiv.addEventListener('click', e => {
        e.stopPropagation();
        searchInput.value = '';
        dropdown.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'custom-breed-input';
        input.placeholder = '请输入具体品种...';
        input.addEventListener('click', e2 => e2.stopPropagation());
        input.addEventListener('input', e2 => {
          if (typeof onSelect === 'function') onSelect(e2.target.value, true);
        });
        dropdown.appendChild(input);
        input.focus();
      });
      dropdown.appendChild(otherDiv);
    }
    dropdown.classList.add('open');
  }

  function updateForType(newType) {
    currentType = newType;
    searchInput.value = '';
    searchInput.placeholder = '🔍 搜索或选择品种...';
    renderDropdown(BREED_PRESETS[currentType] || []);
  }

  searchInput.addEventListener('focus', () => {
    const q = searchInput.value.trim();
    renderDropdown(filterBreeds(currentType, q));
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    renderDropdown(filterBreeds(currentType, q));
  });

  searchInput.addEventListener('keydown', e => {
    if (!dropdown.classList.contains('open')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); highlightedIndex = Math.min(highlightedIndex + 1, dropdown.children.length - 1); updateHighlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlightedIndex = Math.max(highlightedIndex - 1, 0); updateHighlight(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (highlightedIndex >= 0 && highlightedIndex < dropdown.children.length) dropdown.children[highlightedIndex].click(); }
    else if (e.key === 'Escape') { dropdown.classList.remove('open'); }
  });

  function updateHighlight() {
    Array.from(dropdown.children).forEach((c, i) => c.classList.toggle('highlight', i === highlightedIndex));
  }

  document.addEventListener('click', e => {
    if (!container.contains(e.target)) dropdown.classList.remove('open');
  });

  return { setType: updateForType, getType: () => currentType };
}

/* ===================================================================
   模块 C: 页面转场 (3D 卡夹翻开)
   =================================================================== */
function navigateWithTransition(targetUrl) {
  const overlay = document.getElementById('pageTransition');
  if (!overlay) { window.location.href = targetUrl; return; }

  // 显示遮罩并播放翻开动画
  overlay.style.visibility = 'visible';
  overlay.style.transition = 'none';
  overlay.style.transform = 'perspective(1600px) rotateY(0deg)';

  requestAnimationFrame(() => {
    overlay.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    overlay.style.transform = 'perspective(1600px) rotateY(-90deg)';
  });

  setTimeout(() => { window.location.href = targetUrl; }, 450);
}

function pageEnterAnimation() {
  const overlay = document.getElementById('pageTransition');
  if (!overlay) return;

  // 页面加载时从翻开状态滑入
  overlay.style.visibility = 'visible';
  overlay.style.transition = 'none';
  overlay.style.transform = 'perspective(1600px) rotateY(-90deg)';

  requestAnimationFrame(() => {
    overlay.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    overlay.style.transform = 'perspective(1600px) rotateY(0deg)';
    // 动画结束后隐藏
    setTimeout(() => {
      overlay.style.visibility = 'hidden';
      overlay.classList.add('shrink');
    }, 420);
  });
}

/* ===================================================================
   模块 D: 宠物卡片渲染器 (拍立得 + 徽章 + 标签)
   =================================================================== */
function renderPetCards(petList, container) {
  if (!container) return;

  if (!petList || petList.length === 0) {
    container.innerHTML = `
      <div class="pet-grid-empty">
        <span class="empty-icon">📂</span>
        <p>还没有匹配的毛孩子档案</p>
        <p style="font-size:0.82rem;margin-top:4px;color:var(--ink-light);">试试切换筛选条件，或点击右下角 + 创建新档案</p>
        <div class="empty-action" onclick="FormManager.open('add')">📝 创建第一份档案</div>
      </div>`;
    return;
  }

  container.innerHTML = petList.map(pet => {
    const badgeHTML = pet.status === 'star'
      ? '<span class="card-badge badge-star">⭐ 已回星球</span>'
      : pet.category === 'community'
        ? '<span class="card-badge badge-community">📍 社区毛孩</span>'
        : '<span class="card-badge badge-private">🏠 本家主子</span>';

    const tagsHTML = (pet.featureTags || []).map(t =>
      `<span class="card-tag">${t}</span>`
    ).join('');

    const starClass = pet.status === 'star' ? ' status-star' : '';
    const coverPhoto = (pet.photos && pet.photos.length > 0) ? pet.photos[pet.coverIndex || 0] : null;
    const hasPhoto = !!coverPhoto;

    return `
    <div class="pet-card${starClass}"
         style="--card-theme: ${pet.themeColor}; --detail-bg: ${pet.complementBg};"
         data-pet-id="${pet.id}"
         onclick="navigateWithTransition('detail.html?id=${encodeURIComponent(pet.id)}')">
      <div class="card-polaroid${hasPhoto ? ' has-photo' : ''}">
        <div class="polaroid-img">${hasPhoto ? `<img src="${coverPhoto}" alt="${pet.name}">` : pet.avatar}</div>
      </div>
      <div class="card-name">${pet.name}</div>
      ${badgeHTML}
      ${tagsHTML ? `<div class="card-tags">${tagsHTML}</div>` : ''}
      <div class="card-divider"></div>
      <div class="card-meta">
        <span>${pet.gender}</span><span class="meta-dot">·</span>
        <span class="age-num">${pet.age}岁</span><span class="meta-dot">·</span>
        <span>${pet.breed}</span>
      </div>
      <div class="card-id">${pet.id}</div>
    </div>`;
  }).join('');
}

/* ===================================================================
   模块 E: Toast 通知
   =================================================================== */
const Toast = {
  show(msg, type) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.textContent = msg;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 2700);
  }
};

/* ===================================================================
   模块 F: FormManager (新增/编辑宠物)
   =================================================================== */
const FormManager = {
  _mode: 'add',
  _editId: null,
  _selectedAvatar: '🐱',
  _selectedType: 'cat',
  _selectedTags: [],
  _photos: [],
  _coverIndex: 0,
  _hasVideo: false,
  _pendingVideoFile: null,

  open(mode, pet) {
    this._mode = mode;
    this._editId = pet ? pet.id : null;
    this._selectedAvatar = pet ? pet.avatar : '🐱';
    this._selectedType = pet ? pet.type : 'cat';
    this._selectedTags = pet ? [...(pet.featureTags || [])] : [];
    this._photos = pet && pet.photos ? [...pet.photos] : [];
    this._coverIndex = pet ? (pet.coverIndex || 0) : 0;
    this._hasVideo = pet ? !!pet.hasVideo : false;
    this._pendingVideoFile = null;

    let overlay = document.getElementById('formModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'formModalOverlay';
      overlay.className = 'form-modal-overlay';
      overlay.innerHTML = this._buildHTML();
      document.body.appendChild(overlay);

      overlay.querySelector('.form-modal-close').addEventListener('click', () => this.close());
      overlay.addEventListener('click', e => { if (e.target === overlay) this.close(); });
      this._bindEvents(overlay);
    }

    // 更新标题
    overlay.querySelector('.form-modal-title').textContent = mode === 'add' ? '📝 新建毛孩档案' : '✏️ 编辑档案';

    // 填充数据 (编辑模式)
    if (mode === 'edit' && pet) this._fillForm(overlay, pet);
    else this._resetForm(overlay);

    overlay.classList.add('open');
    this._updateTypeUI(overlay);
    this._updateAvatarUI(overlay);
    this._updateTagUI(overlay);
    this._renderPhotoThumbs(overlay);
    this._renderVideoState(overlay);
  },

  close() {
    const overlay = document.getElementById('formModalOverlay');
    if (overlay) overlay.classList.remove('open');
    this._editId = null;
  },

  _buildHTML() {
    const catEmojis = AVATAR_EMOJIS.cat;
    const dogEmojis = AVATAR_EMOJIS.dog;
    const allEmojis = [...new Set([...catEmojis, ...dogEmojis])];

    return `
    <div class="form-modal">
      <div class="form-modal-header">
        <span class="form-modal-title">📝 新建毛孩档案</span>
        <button class="form-modal-close">✕</button>
      </div>

      <div class="avatar-picker-label">🐾 选择头像 Emoji</div>
      <div class="avatar-picker" id="avatarPicker">
        ${allEmojis.map(e => `<span class="avatar-option" data-emoji="${e}">${e}</span>`).join('')}
      </div>

      <!-- 照片上传 -->
      <div class="form-group">
        <div class="photo-section-label">📸 照片 (可上传多张)</div>
        <div class="photo-upload-area" id="photoUploadArea"></div>
        <div class="cover-hint">🖼️ <b>点击照片设为封面</b> — 带 ★ 橙色边框的为当前封面</div>
        <input type="file" class="photo-file-input" id="photoFileInput" accept="image/*" multiple>
      </div>

      <!-- 视频上传 -->
      <div class="form-group">
        <div class="photo-section-label">🎬 视频 (可选)</div>
        <div class="video-upload-row" id="videoUploadRow">
          <button class="video-add-btn" id="videoAddBtn">📹 选择视频</button>
          <span class="video-info" id="videoInfo" style="display:none;"></span>
        </div>
        <input type="file" class="video-file-input" id="videoFileInput" accept="video/*">
      </div>

      <div class="form-group">
        <label class="form-label">名字 <span class="required">*</span></label>
        <input class="form-input" id="formName" placeholder="给毛孩子起个名字..." maxlength="20">
      </div>

      <div class="form-group">
        <label class="form-label">类型 <span class="required">*</span></label>
        <div class="radio-group type-radio-scroll" id="formTypeGroup">
          ${Object.entries(PET_TYPES).map(([key, info]) =>
            `<button class="radio-btn" data-type="${key}">${info.label}</button>`
          ).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">品种</label>
        <input class="form-input" id="formBreed" placeholder="选择或输入品种..." list="breedList">
        <datalist id="breedList"></datalist>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">年龄 (岁)</label>
          <input class="form-input" id="formAge" type="number" placeholder="0" min="0" max="30">
        </div>
        <div class="form-group">
          <label class="form-label">性别</label>
          <div class="radio-group" id="formGenderGroup">
            <button class="radio-btn" data-gender="♀">♀ 女孩</button>
            <button class="radio-btn" data-gender="♂">♂ 男孩</button>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">体重</label>
          <input class="form-input" id="formWeight" placeholder="例: 4.2kg">
        </div>
        <div class="form-group">
          <label class="form-label">身份</label>
          <div class="radio-group" id="formCategoryGroup">
            <button class="radio-btn" data-category="private">🏠 本家</button>
            <button class="radio-btn" data-category="community">📍 社区</button>
          </div>
        </div>
      </div>

      <div class="form-group" id="formLocationGroup" style="display:none;">
        <label class="form-label">常驻地点</label>
        <input class="form-input" id="formLocation" placeholder="例: 图书馆前草坪">
      </div>

      <div class="form-group">
        <label class="form-label">主人</label>
        <input class="form-input" id="formOwner" placeholder="你的名字...">
      </div>

      <div class="form-group">
        <label class="form-label">特征标签 (可多选)</label>
        <div class="tag-multi-select" id="formTagSelect"></div>
      </div>

      <div class="form-group">
        <label class="form-label">最爱食物</label>
        <input class="form-input" id="formFood" placeholder="例: 鸡胸肉条">
      </div>

      <div class="form-group">
        <label class="form-label">性格描述</label>
        <input class="form-input" id="formPersonality" placeholder="简短描述性格...">
      </div>

      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" id="formNotes" placeholder="其他想记录的信息..."></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">状态</label>
        <div class="radio-group" id="formStatusGroup">
          <button class="radio-btn" data-status="active">🟢 健康活跃</button>
          <button class="radio-btn" data-status="star">⭐ 已回星球</button>
        </div>
      </div>

      <button class="form-submit" id="formSubmit">💾 保存档案</button>
    </div>`;
  },

  _bindEvents(overlay) {
    // 头像选择
    overlay.querySelector('#avatarPicker').addEventListener('click', e => {
      const opt = e.target.closest('.avatar-option');
      if (!opt) return;
      this._selectedAvatar = opt.dataset.emoji;
      this._updateAvatarUI(overlay);
    });

    // 类型切换
    overlay.querySelector('#formTypeGroup').addEventListener('click', e => {
      const btn = e.target.closest('.radio-btn');
      if (!btn) return;
      this._selectedType = btn.dataset.type;
      this._updateTypeUI(overlay);
    });

    // 类别切换（显示/隐藏地点）
    overlay.querySelector('#formCategoryGroup').addEventListener('click', e => {
      const btn = e.target.closest('.radio-btn');
      if (!btn) return;
      overlay.querySelector('#formCategoryGroup').querySelectorAll('.radio-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const locGroup = overlay.querySelector('#formLocationGroup');
      locGroup.style.display = btn.dataset.category === 'community' ? 'block' : 'none';
    });

    // Radio 组通用
    overlay.querySelectorAll('.radio-group').forEach(group => {
      group.addEventListener('click', e => {
        const btn = e.target.closest('.radio-btn');
        if (!btn) return;
        group.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // 提交
    overlay.querySelector('#formSubmit').addEventListener('click', () => this._submit());

    // 照片上传
    const photoInput = overlay.querySelector('#photoFileInput');
    if (photoInput) {
      photoInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        for (const file of files) {
          if (this._photos.length >= 9) break;
          try {
            const dataUrl = await compressImage(file, 400, 400, 0.75);
            this._photos.push(dataUrl);
          } catch (err) {
            Toast.show('照片处理失败: ' + err.message, 'error');
          }
        }
        if (this._photos.length > 0 && this._coverIndex >= this._photos.length) {
          this._coverIndex = 0;
        }
        this._renderPhotoThumbs(overlay);
        photoInput.value = '';
      });
    }

    // 视频上传
    const videoInput = overlay.querySelector('#videoFileInput');
    const videoAddBtn = overlay.querySelector('#videoAddBtn');
    if (videoAddBtn && videoInput) {
      videoAddBtn.addEventListener('click', () => videoInput.click());
      videoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 100 * 1024 * 1024) {
          Toast.show('视频不能超过100MB哦~', 'error');
          videoInput.value = '';
          return;
        }
        this._pendingVideoFile = file;
        this._hasVideo = true;
        this._renderVideoState(overlay);
        videoInput.value = '';
      });
    }
  },

  _updateAvatarUI(overlay) {
    overlay.querySelectorAll('.avatar-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.emoji === this._selectedAvatar);
    });
  },

  _updateTypeUI(overlay) {
    overlay.querySelector('#formTypeGroup').querySelectorAll('.radio-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.type === this._selectedType);
    });
    // 更新品种 datalist
    const list = overlay.querySelector('#breedList');
    list.innerHTML = (BREED_PRESETS[this._selectedType] || []).map(b => `<option value="${b}">`).join('');
    // 更新标签
    this._updateTagUI(overlay);
  },

  _updateTagUI(overlay) {
    const container = overlay.querySelector('#formTagSelect');
    const tags = FEATURE_TAGS[this._selectedType] || [];
    container.innerHTML = tags.map(t => {
      const sel = this._selectedTags.includes(t) ? ' selected' : '';
      return `<span class="tag-option${sel}" data-tag="${t}">${t}</span>`;
    }).join('');

    // 移除旧监听器再绑定新监听器（避免重复绑定）
    if (this._tagHandler) container.removeEventListener('click', this._tagHandler);
    this._tagHandler = (e) => {
      const opt = e.target.closest('.tag-option');
      if (!opt) return;
      const tag = opt.dataset.tag;
      if (this._selectedTags.includes(tag)) {
        this._selectedTags = this._selectedTags.filter(t => t !== tag);
      } else {
        this._selectedTags.push(tag);
      }
      opt.classList.toggle('selected', this._selectedTags.includes(tag));
    };
    container.addEventListener('click', this._tagHandler);
  },

  /** 渲染照片缩略图 */
  _renderPhotoThumbs(overlay) {
    const area = overlay.querySelector('#photoUploadArea');
    if (!area) return;
    area.innerHTML = '';

    // 已有照片
    this._photos.forEach((dataUrl, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'photo-thumb' + (idx === this._coverIndex ? ' is-cover' : '');
      thumb.style.backgroundImage = `url(${dataUrl})`;
      thumb.title = idx === this._coverIndex ? '当前封面' : '点击设为封面';
      thumb.addEventListener('click', () => {
        this._coverIndex = idx;
        this._renderPhotoThumbs(overlay);
      });
      // 删除按钮
      const del = document.createElement('span');
      del.className = 'photo-delete';
      del.textContent = '✕';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        this._photos.splice(idx, 1);
        if (this._coverIndex >= this._photos.length) {
          this._coverIndex = Math.max(0, this._photos.length - 1);
        }
        this._renderPhotoThumbs(overlay);
      });
      thumb.appendChild(del);
      // 封面标记
      if (idx === this._coverIndex) {
        const badge = document.createElement('span');
        badge.className = 'cover-badge';
        badge.textContent = '★';
        thumb.appendChild(badge);
        const label = document.createElement('span');
        label.className = 'cover-label';
        label.textContent = '封面';
        thumb.appendChild(label);
      }
      area.appendChild(thumb);
    });

    // 添加按钮
    if (this._photos.length < 9) {
      const addBtn = document.createElement('div');
      addBtn.className = 'photo-add-btn';
      addBtn.innerHTML = '<span class="add-icon">+</span><span>添加</span>';
      addBtn.addEventListener('click', () => {
        const fileInput = overlay.querySelector('#photoFileInput');
        if (fileInput) fileInput.click();
      });
      area.appendChild(addBtn);
    }
  },

  /** 渲染视频状态 */
  _renderVideoState(overlay) {
    const info = overlay.querySelector('#videoInfo');
    if (!info) return;
    if (this._pendingVideoFile) {
      info.style.display = 'flex';
      info.innerHTML = '✅ ' + this._pendingVideoFile.name + ' <span class="video-remove-btn" id="videoRemoveBtn">移除</span>';
      setTimeout(() => {
        const rm = overlay.querySelector('#videoRemoveBtn');
        if (rm) rm.onclick = () => {
          this._pendingVideoFile = null;
          this._hasVideo = false;
          this._renderVideoState(overlay);
        };
      }, 50);
    } else if (this._hasVideo) {
      info.style.display = 'flex';
      info.innerHTML = '✅ 已有视频 <span class="video-remove-btn" id="videoRemoveBtn">移除</span>';
      setTimeout(() => {
        const rm = overlay.querySelector('#videoRemoveBtn');
        if (rm) rm.onclick = () => {
          this._pendingVideoFile = null;
          this._hasVideo = false;
          this._renderVideoState(overlay);
        };
      }, 50);
    } else {
      info.style.display = 'none';
      info.innerHTML = '';
    }
  },

  _fillForm(overlay, pet) {
    overlay.querySelector('#formName').value = pet.name || '';
    overlay.querySelector('#formBreed').value = pet.breed || '';
    overlay.querySelector('#formAge').value = pet.age || '';
    overlay.querySelector('#formWeight').value = pet.weight || '';
    overlay.querySelector('#formOwner').value = pet.owner || '';
    overlay.querySelector('#formFood').value = pet.favoriteFood || '';
    overlay.querySelector('#formPersonality').value = pet.personality || '';
    overlay.querySelector('#formNotes').value = pet.notes || '';
    overlay.querySelector('#formLocation').value = pet.location || '';

    this._selectedAvatar = pet.avatar || '🐱';
    this._selectedType = pet.type || 'cat';
    this._selectedTags = [...(pet.featureTags || [])];
    this._photos = pet.photos ? [...pet.photos] : [];
    this._coverIndex = pet.coverIndex || 0;
    this._hasVideo = !!pet.hasVideo;
    this._pendingVideoFile = null;

    // 选中状态按钮
    const setBtn = (id, value, attr) => {
      overlay.querySelectorAll(`#${id} .radio-btn`).forEach(b => {
        b.classList.toggle('selected', b.dataset[attr] === value);
      });
    };
    setBtn('formTypeGroup', pet.type, 'type');
    setBtn('formGenderGroup', pet.gender, 'gender');
    setBtn('formCategoryGroup', pet.category || 'private', 'category');
    setBtn('formStatusGroup', pet.status || 'active', 'status');

    overlay.querySelector('#formLocationGroup').style.display = pet.category === 'community' ? 'block' : 'none';
  },

  _resetForm(overlay) {
    overlay.querySelector('#formName').value = '';
    overlay.querySelector('#formBreed').value = '';
    overlay.querySelector('#formAge').value = '';
    overlay.querySelector('#formWeight').value = '';
    overlay.querySelector('#formOwner').value = '';
    overlay.querySelector('#formFood').value = '';
    overlay.querySelector('#formPersonality').value = '';
    overlay.querySelector('#formNotes').value = '';
    overlay.querySelector('#formLocation').value = '';
    this._selectedAvatar = '🐱';
    this._selectedType = 'cat';
    this._selectedTags = [];
    this._photos = [];
    this._coverIndex = 0;
    this._hasVideo = false;
    this._pendingVideoFile = null;

    const setDefault = (id, value, attr) => {
      overlay.querySelectorAll(`#${id} .radio-btn`).forEach(b => {
        b.classList.toggle('selected', b.dataset[attr] === value);
      });
    };
    setDefault('formTypeGroup', 'cat', 'type');
    setDefault('formGenderGroup', '♀', 'gender');
    setDefault('formCategoryGroup', 'private', 'category');
    setDefault('formStatusGroup', 'active', 'status');
    overlay.querySelector('#formLocationGroup').style.display = 'none';
  },

  async _submit() {
    const overlay = document.getElementById('formModalOverlay');
    if (!overlay) return;

    const getVal = id => overlay.querySelector('#' + id)?.value?.trim() || '';
    const getSelected = (id, attr) => {
      const el = overlay.querySelector(`#${id} .radio-btn.selected`);
      return el ? el.dataset[attr] : '';
    };

    const name = getVal('formName');
    if (!name) { Toast.show('请填写毛孩子的名字哦~', 'error'); return; }

    const petData = {
      name,
      type: getSelected('formTypeGroup', 'type') || 'cat',
      breed: getVal('formBreed'),
      age: parseInt(getVal('formAge')) || 0,
      gender: getSelected('formGenderGroup', 'gender') || '♀',
      weight: getVal('formWeight'),
      category: getSelected('formCategoryGroup', 'category') || 'private',
      location: getVal('formLocation'),
      owner: getVal('formOwner'),
      featureTags: [...this._selectedTags],
      favoriteFood: getVal('formFood'),
      personality: getVal('formPersonality'),
      notes: getVal('formNotes'),
      status: getSelected('formStatusGroup', 'status') || 'active',
      avatar: this._selectedAvatar,
      photos: [...this._photos],
      coverIndex: this._coverIndex,
      hasVideo: this._hasVideo || !!this._pendingVideoFile,
      themeColor: this._randomThemeColor(),
      complementBg: '#FFFDF9'
    };

    let savedPet;
    if (this._mode === 'add') {
      savedPet = PetStore.add(petData);
      Toast.show(`🎉 ${savedPet.name} 的档案创建成功！`, 'success');
    } else {
      savedPet = PetStore.update(this._editId, petData);
      Toast.show(`✅ 档案已更新`, 'success');
    }

    // 保存视频到 IndexedDB
    if (this._pendingVideoFile && savedPet) {
      try {
        await VideoDB.save(savedPet.id, this._pendingVideoFile);
      } catch (e) {
        console.error('视频保存失败:', e);
        Toast.show('视频保存失败，请重试', 'error');
      }
    }
    // 如果标记了删除视频
    if (!this._hasVideo && !this._pendingVideoFile && savedPet && this._mode === 'edit') {
      try {
        await VideoDB.remove(savedPet.id);
      } catch (e) { /* ignore */ }
    }

    this.close();
    refreshPets();
    this._refreshCurrentPage();
  },

  _randomThemeColor() {
    const colors = ['#D4956B','#F0A8B8','#E8943A','#B8C5D6','#8B9A6E','#C4A882','#4A4A4A','#8B6F5C','#B0A090','#D4956B','#F5E6D3'];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  _refreshCurrentPage() {
    if (document.getElementById('petGrid')) {
      initIndexPage();
    } else if (document.getElementById('petDetail')) {
      initDetailPage();
    }
  }
};

/* ===================================================================
   模块 G: DeleteConfirm
   =================================================================== */
const DeleteConfirm = {
  show(pet, onConfirm) {
    let overlay = document.getElementById('confirmOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'confirmOverlay';
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <div class="confirm-icon">😿</div>
          <div class="confirm-title">确认删除？</div>
          <div class="confirm-subtitle" id="confirmPetName"></div>
          <div class="confirm-subtitle" style="font-size:0.72rem;color:var(--ink-light);">该操作不可恢复</div>
          <div class="confirm-btns">
            <button class="confirm-cancel">取消</button>
            <button class="confirm-delete">确认删除</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelector('.confirm-cancel').addEventListener('click', () => this.close());
      overlay.addEventListener('click', e => { if (e.target === overlay) this.close(); });
    }

    overlay.querySelector('#confirmPetName').textContent = `🐾 ${pet.name} · ${pet.breed}`;
    overlay.querySelector('.confirm-delete').onclick = () => {
      PetStore.delete(pet.id);
      refreshPets();
      Toast.show(`已删除 ${pet.name} 的档案`, 'error');
      this.close();

      // 如果在详情页，返回首页
      if (document.getElementById('petDetail')) {
        navigateWithTransition('index.html');
      } else if (typeof onConfirm === 'function') {
        onConfirm();
        initIndexPage();
      }
    };

    overlay.classList.add('open');
  },

  close() {
    const overlay = document.getElementById('confirmOverlay');
    if (overlay) overlay.classList.remove('open');
  }
};

/* ===================================================================
   模块 H: 首页初始化
   =================================================================== */
function initIndexPage() {
  pageEnterAnimation();

  // 标题动画
  setTimeout(() => {
    animateSequence([
      { el: document.querySelector('.title-main'), mode: 'chars', baseDelay: 0 },
      { el: document.querySelector('.title-sub'), mode: 'words', baseDelay: 300 },
    ]);
  }, 300);

  // 动态渲染类型标签
  const typeTabsContainer = document.getElementById('typeTabs');
  const breedSelectorContainer = document.querySelector('.breed-selector');
  const petGrid = document.getElementById('petGrid');

  let currentType = 'cat';
  let currentBreed = '';

  // 渲染所有类型标签（含"全部"）
  if (typeTabsContainer) {
    typeTabsContainer.innerHTML = '<button class="type-tab active" data-type="all">🌍 全部</button>' +
      Object.entries(PET_TYPES).map(([key, info]) =>
        `<button class="type-tab" data-type="${key}">${info.label}</button>`
      ).join('');
    currentType = 'all';

    typeTabsContainer.querySelectorAll('.type-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        typeTabsContainer.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentType = tab.dataset.type;
        currentBreed = '';
        if (breedCtrl) breedCtrl.setType(currentType === 'all' ? 'cat' : currentType);
        refreshGrid();
      });
    });
  }

  const breedCtrl = initBreedSelector(breedSelectorContainer, 'cat', (breed) => {
    currentBreed = breed;
    refreshGrid();
  });

  function refreshGrid() {
    let filtered = filterPets(currentType === 'all' ? null : currentType, '');
    if (currentBreed) filtered = filtered.filter(p => p.breed === currentBreed);
    renderPetCards(filtered, petGrid);
  }

  refreshGrid();

  // FAB 按钮
  let fab = document.getElementById('fabAddBtn');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'fabAddBtn';
    fab.className = 'fab-btn';
    fab.textContent = '+';
    fab.title = '新建档案';
    fab.addEventListener('click', () => FormManager.open('add'));
    document.body.appendChild(fab);
  }
}

/* ===================================================================
   模块 I: 详情页初始化
   =================================================================== */
function initDetailPage() {
  pageEnterAnimation();

  const params = new URLSearchParams(window.location.search);
  const petId = params.get('id');
  const pet = getPetById(petId);

  const detailContainer = document.getElementById('petDetail');
  if (!pet || !detailContainer) {
    if (detailContainer) {
      detailContainer.innerHTML = `
        <div class="pet-grid-empty">
          <span class="empty-icon">😿</span>
          <p>未找到该宠物信息</p>
          <p style="font-size:0.8rem;color:var(--ink-light);">可能已被删除</p>
          <div class="empty-action" onclick="navigateWithTransition('index.html')">← 返回首页</div>
        </div>`;
    }
    return;
  }

  // 注入主题色
  detailContainer.style.setProperty('--detail-bg', pet.complementBg);

  // 状态置灰
  if (pet.status === 'star') detailContainer.classList.add('status-star');
  else detailContainer.classList.remove('status-star');

  const badgeHTML = pet.status === 'star'
    ? '<span class="detail-badge badge-star" style="background:var(--status-star-bg);color:var(--status-star);">⭐ 已回星球 · 永恒纪念</span>'
    : pet.category === 'community'
      ? `<span class="detail-badge badge-community" style="background:var(--tag-community);color:var(--tag-comm-text);">📍 社区毛孩${pet.location ? ' · @' + pet.location : ''}</span>`
      : '<span class="detail-badge badge-private" style="background:var(--tag-cat);color:var(--tag-cat-text);">🏠 本家主子</span>';

  const tagsHTML = (pet.featureTags || []).map(t =>
    `<span class="detail-tag">${t}</span>`
  ).join('');

  const coverPhoto = (pet.photos && pet.photos.length > 0) ? pet.photos[pet.coverIndex || 0] : null;
  const hasPhoto = !!coverPhoto;

  detailContainer.innerHTML = `
    <div class="detail-polaroid${hasPhoto ? ' has-photo' : ''}">
      <div class="polaroid-img">${hasPhoto ? `<img src="${coverPhoto}" alt="${pet.name}">` : pet.avatar}</div>
      <div class="polaroid-caption">${pet.name} · ${pet.date}</div>
    </div>

    <div class="detail-badge-row">${badgeHTML}</div>

    <div class="detail-info-grid">
      <div class="detail-info-item"><div class="info-label">品种</div><div class="info-value">${pet.breed || '—'}</div></div>
      <div class="detail-info-item"><div class="info-label">年龄</div><div class="info-value age-num">${pet.age} 岁</div></div>
      <div class="detail-info-item"><div class="info-label">性别</div><div class="info-value">${pet.gender || '—'}</div></div>
      <div class="detail-info-item"><div class="info-label">体重</div><div class="info-value weight-num">${pet.weight || '—'}</div></div>
      <div class="detail-info-item"><div class="info-label">主人</div><div class="info-value">${pet.owner || '—'}</div></div>
      <div class="detail-info-item"><div class="info-label">登记日期</div><div class="info-value">${pet.date || '—'}</div></div>
    </div>

    ${tagsHTML ? `<div class="detail-tags-section">${tagsHTML}</div>` : ''}

    <hr class="detail-divider">

    <div class="detail-notes">
      ${pet.notes ? `<p style="margin-bottom:6px;">📋 ${pet.notes}</p>` : ''}
      ${pet.favoriteFood ? `<p style="color:var(--ink-light);font-size:0.8rem;">🍖 最爱: ${pet.favoriteFood}</p>` : ''}
      ${pet.personality ? `<p style="color:var(--ink-light);font-size:0.8rem;">💬 ${pet.personality}</p>` : ''}
    </div>

    ${(pet.photos && pet.photos.length > 1) ? `
      <div class="gallery-label">📸 更多照片 (${pet.photos.length}张)</div>
      <div class="photo-gallery" id="photoGallery">
        ${pet.photos.map((p, i) => `
          <div class="gallery-photo" style="background-image:url(${p})"
               data-photo-index="${i}"
               title="${i === (pet.coverIndex || 0) ? '封面照' : '点击查看大图'}">
          </div>
        `).join('')}
      </div>
    ` : ''}

  `;

  // 帖子记录
  renderPosts(pet);

  // 发帖按钮
  const postBtn = document.getElementById('postNewBtn');
  if (postBtn) {
    postBtn.onclick = () => PostForm.open(pet);
  }

  // 生成小票按钮 (使用 onclick 避免重复绑定)
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) {
    generateBtn.onclick = () => generateReceipt(pet);
  }

  // 编辑按钮
  const editBtn = document.getElementById('editBtn');
  if (editBtn) {
    editBtn.onclick = () => FormManager.open('edit', pet);
  }

  // 删除按钮
  const deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.onclick = () => DeleteConfirm.show(pet);
  }

  // 社区FAB
  let fab = document.getElementById('communityFab');
  if (fab) fab.remove();
  let fabLabel = document.getElementById('communityFabLabel');
  if (fabLabel) fabLabel.remove();
  if (pet.status === 'active') {
    // 文字标签
    fabLabel = document.createElement('span');
    fabLabel.id = 'communityFabLabel';
    fabLabel.className = 'fab-label';
    fabLabel.textContent = '打卡记录';
    document.body.appendChild(fabLabel);
    // FAB 按钮
    fab = document.createElement('button');
    fab.id = 'communityFab';
    fab.className = 'community-fab';
    fab.textContent = '🐾';
    fab.title = '打卡记录毛孩子的日常';
    fab.onclick = () => CheckinForm.open(pet);
    document.body.appendChild(fab);
  }

  // 关闭小票预览
  const closeBtn = document.getElementById('closeReceipt');
  const receiptOverlay = document.getElementById('receiptOverlay');
  if (closeBtn && receiptOverlay) {
    closeBtn.onclick = () => receiptOverlay.classList.remove('visible');
    receiptOverlay.onclick = (e) => {
      if (e.target === receiptOverlay) receiptOverlay.classList.remove('visible');
    };
  }

  // 照片画廊点击 → 全屏查看
  const gallery = document.getElementById('photoGallery');
  if (gallery) {
    gallery.addEventListener('click', (e) => {
      const photo = e.target.closest('.gallery-photo');
      if (!photo) return;
      const idx = parseInt(photo.dataset.photoIndex);
      const photoUrl = pet.photos[idx];
      if (!photoUrl) return;
      // 全屏查看
      let viewer = document.getElementById('photoFullView');
      if (!viewer) {
        viewer = document.createElement('div');
        viewer.id = 'photoFullView';
        viewer.style.cssText = 'position:fixed;inset:0;z-index:7000;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;cursor:pointer;';
        viewer.addEventListener('click', () => viewer.remove());
        document.body.appendChild(viewer);
      }
      viewer.innerHTML = `<img src="${photoUrl}" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:4px;">`;
    });
  }

}

/* ===================================================================
   模块 J: 帖子渲染 (微博式记录)
   =================================================================== */
function renderPosts(pet) {
  const section = document.getElementById('timelineSection');
  if (!section) return;

  const posts = PostStore.getPosts(pet.id);

  if (posts.length === 0) {
    section.innerHTML = `
      <div class="timeline-title">📜 时光记录</div>
      <div class="post-empty">还没有记录～<br>点击下方「📝 发帖」写下第一条吧 ✨</div>`;
    return;
  }

  const cardsHTML = posts.map((post, i) => {
    // 照片区域
    let photosHTML = '';
    if (post.photos && post.photos.length > 0) {
      if (post.photos.length === 1) {
        photosHTML = `<img class="post-photo-single" src="${post.photos[0]}" alt="照片" onclick="viewFullImage('${post.photos[0]}')">`;
      } else {
        photosHTML = `<div class="post-photos">${post.photos.map(p =>
          `<img class="post-photo" src="${p}" alt="照片" onclick="viewFullImage('${p}')">`
        ).join('')}</div>`;
      }
    }

    // 视频区域（支持多段）
    let videoHTML = '';
    if (post.videoCount > 0) {
      videoHTML = Array.from({length: post.videoCount}, (_, vi) =>
        `<div class="post-video-wrap" id="video_${post.id}_${vi}" style="margin-bottom:6px;">
          <p style="font-size:0.7rem;color:var(--ink-light);padding:8px;text-align:center;">📹 视频 ${vi+1} 加载中...</p>
        </div>`
      ).join('');
    }

    // 地点
    const locHTML = post.location
      ? `<span class="post-location">📍 ${post.location}</span>`
      : '';

    return `
    <div style="position:relative;">
      <span class="timeline-dot">🐾</span>
      <div class="post-card">
        <div class="post-header">
          <div class="post-meta">
            <span class="post-date">${post.date}${post.time ? ' ' + post.time : ''}</span>
            ${locHTML}
          </div>
          <span class="post-delete-btn" data-post-id="${post.id}" data-pet-id="${pet.id}">🗑️</span>
        </div>
        ${post.text ? `<div class="post-text">${post.text}</div>` : ''}
        ${photosHTML}
        ${videoHTML}
      </div>
    </div>`;
  }).join('');

  section.innerHTML = `
    <div class="timeline-title">📜 时光记录 · ${posts.length} 条</div>
    <div class="post-timeline">${cardsHTML}</div>`;

  // 绑定删除事件
  section.querySelectorAll('.post-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.dataset.postId;
      const petId = btn.dataset.petId;
      if (confirm('确认删除这条记录吗？')) {
        PostStore.deletePost(petId, postId).then(() => {
          Toast.show('记录已删除', 'success');
          renderPosts(pet);
        });
      }
    });
  });

  // 加载所有视频
  posts.forEach(post => {
    if (post.videoCount > 0) {
      for (let vi = 0; vi < post.videoCount; vi++) {
        loadPostVideo(post.id, vi);
      }
    }
  });
}

/** 加载帖子中的视频 */
async function loadPostVideo(postId, vi) {
  const wrap = document.getElementById('video_' + postId + '_' + vi);
  if (!wrap) return;
  try {
    const record = await VideoDB.get('post_video_' + postId + '_' + vi);
    if (!record || !record.data) { wrap.style.display = 'none'; return; }
    const url = URL.createObjectURL(record.data);
    wrap.innerHTML = `<video controls playsinline preload="metadata" src="${url}" type="${record.type || 'video/mp4'}"></video>`;
  } catch (e) {
    wrap.style.display = 'none';
  }
}

/** 全屏查看图片 */
function viewFullImage(src) {
  let viewer = document.getElementById('photoFullView');
  if (!viewer) {
    viewer = document.createElement('div');
    viewer.id = 'photoFullView';
    viewer.style.cssText = 'position:fixed;inset:0;z-index:7000;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;cursor:pointer;';
    viewer.addEventListener('click', () => viewer.remove());
    document.body.appendChild(viewer);
  }
  viewer.innerHTML = `<img src="${src}" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:4px;">`;
}

/* ===================================================================
   模块 J-2: CheckinForm — 轻量打卡弹窗
   =================================================================== */
const CHECKIN_TYPES = [
  { key: 'sighting', icon: '👀', label: '偶遇了' },
  { key: 'feeding',  icon: '🍖', label: '喂食' },
  { key: 'playing',  icon: '🎾', label: '陪玩' },
  { key: 'photo',    icon: '📸', label: '拍照' },
  { key: 'health',   icon: '💊', label: '健康观察' },
  { key: 'other',    icon: '✨', label: '其他' }
];

const CheckinForm = {
  _pet: null,
  _type: 'sighting',

  open(pet) {
    this._pet = pet;
    this._type = 'sighting';

    let overlay = document.getElementById('checkinOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'checkinOverlay';
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = this._buildHTML();
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) this.close(); });
      this._bindEvents(overlay);
    }

    // 自动填时间
    const now = new Date();
    overlay.querySelector('#checkinDate').value = now.toISOString().split('T')[0];
    overlay.querySelector('#checkinTime').value =
      String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    // 自动填地点：先用宠物默认地点
    overlay.querySelector('#checkinLocation').value = pet.location || '';

    // 常用地点快捷选择
    this._renderRecentLocations(overlay);

    // 尝试自动定位
    this._tryGeolocation(overlay);

    // 高亮默认类型
    this._selectType(overlay, 'sighting');

    overlay.classList.add('open');
  },

  close() {
    const overlay = document.getElementById('checkinOverlay');
    if (overlay) overlay.classList.remove('open');
    this._pet = null;
  },

  _buildHTML() {
    const typesHTML = CHECKIN_TYPES.map(t =>
      `<button class="checkin-type-btn" data-type="${t.key}">${t.icon} ${t.label}</button>`
    ).join('');

    return `
    <div class="confirm-dialog" style="width:90vw;max-width:360px;text-align:left;padding:24px 20px 18px;">
      <div class="confirm-title" style="margin-bottom:14px;">🐾 快速打卡</div>

      <div class="checkin-type-row" id="checkinTypeRow">${typesHTML}</div>

      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div class="form-group" style="flex:1;">
          <label class="form-label" style="font-size:0.7rem;">📅 日期</label>
          <input class="form-input" id="checkinDate" type="date" style="font-size:0.8rem;padding:8px;">
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label" style="font-size:0.7rem;">🕐 时间</label>
          <input class="form-input" id="checkinTime" type="time" style="font-size:0.8rem;padding:8px;">
        </div>
      </div>

      <div class="form-group" style="margin-bottom:16px;">
        <label class="form-label" style="font-size:0.7rem;">📍 地点 <span id="gpsHint" style="color:var(--tag-comm-text);font-size:0.65rem;"></span></label>
        <input class="form-input" id="checkinLocation" placeholder="输入或选择地点..." style="font-size:0.8rem;padding:8px;" autocomplete="off">
        <div class="recent-locations" id="recentLocations" style="display:none;"></div>
      </div>

      <div style="display:flex;gap:8px;">
        <button class="confirm-cancel" id="checkinCancel" style="flex:1;">取消</button>
        <button class="confirm-delete" id="checkinSubmit" style="flex:1;background:var(--tag-comm-text);">✅ 打卡</button>
      </div>
    </div>`;
  },

  _bindEvents(overlay) {
    // 类型选择
    overlay.querySelector('#checkinTypeRow').addEventListener('click', e => {
      const btn = e.target.closest('.checkin-type-btn');
      if (!btn) return;
      this._selectType(overlay, btn.dataset.type);
    });

    overlay.querySelector('#checkinCancel').addEventListener('click', () => this.close());
    overlay.querySelector('#checkinSubmit').addEventListener('click', () => this._submit());
  },

  _selectType(overlay, typeKey) {
    this._type = typeKey;
    overlay.querySelectorAll('.checkin-type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.type === typeKey);
    });
  },

  _renderRecentLocations(overlay) {
    const container = overlay.querySelector('#recentLocations');
    const locations = JSON.parse(localStorage.getItem('recent_locations') || '[]');
    if (locations.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'flex';
    container.innerHTML = locations.slice(0, 5).map(l =>
      `<span class="recent-loc-tag" data-loc="${l}">📍 ${l}</span>`
    ).join('');
    // 点击填入
    container.querySelectorAll('.recent-loc-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        overlay.querySelector('#checkinLocation').value = tag.dataset.loc;
      });
    });
  },

  _saveLocation(loc) {
    if (!loc.trim()) return;
    const locations = JSON.parse(localStorage.getItem('recent_locations') || '[]');
    const filtered = locations.filter(l => l !== loc);
    filtered.unshift(loc);
    localStorage.setItem('recent_locations', JSON.stringify(filtered.slice(0, 10)));
  },

  _tryGeolocation(overlay) {
    const hint = overlay.querySelector('#gpsHint');
    const locInput = overlay.querySelector('#checkinLocation');
    const self = this;

    hint.textContent = '📍 定位中...';

    // IP 定位 - 双服务备份
    const tryLocate = (url, parser) => {
      fetch(url).then(r => r.json()).then(data => {
        const addr = parser(data);
        if (addr) {
          hint.textContent = '✅ ' + (addr.length > 20 ? addr.slice(0, 20) + '…' : addr);
          if (!locInput.value.trim()) locInput.value = addr;
        }
      }).catch(() => {});
    };

    tryLocate('https://ipinfo.io/json', d => {
      const parts = [];
      if (d.city) parts.push(d.city);
      if (d.region) parts.push(d.region);
      if (d.country) parts.push(d.country);
      return parts.join(', ');
    });

    // 备选
    setTimeout(() => {
      if (!locInput.value.trim()) {
        tryLocate('https://ipapi.co/json/', d => {
          const parts = [];
          if (d.city) parts.push(d.city);
          if (d.region) parts.push(d.region);
          if (d.country_name) parts.push(d.country_name);
          return parts.join(', ');
        });
      }
    }, 3000);
  },

  _tryGPS(hint, locInput) {
    // 方案2: 浏览器 GPS（更精确，需授权）
    if (navigator.geolocation) {
      hint.textContent = '🛰️ 尝试GPS...';
      navigator.geolocation.getCurrentPosition(
        pos => {
          hint.textContent = '✅ GPS定位';
          if (!locInput.value.trim()) {
            locInput.value = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          }
        },
        () => { hint.textContent = '⚠️ 请手动输入地点'; },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      hint.textContent = '⚠️ 请手动输入地点';
    }
  },

  _fallbackIP(hint, locInput) {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    fetch('https://restapi.amap.com/v3/ip?key=d4fc8b72d49064c5f3107e45818aa613', { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        if (data.status === '1' && data.city) {
          const addr = [data.province, data.city].filter(Boolean).join(' ');
          hint.textContent = '✅ ' + (addr.length > 16 ? data.city : addr);
          if (!locInput.value.trim()) locInput.value = addr;
        } else {
          hint.textContent = '⚠️ 请手动输入';
        }
      })
      .catch(() => { hint.textContent = '⚠️ 请手动输入'; });
  },

  _submit() {
    const overlay = document.getElementById('checkinOverlay');
    if (!overlay || !this._pet) return;

    const date = overlay.querySelector('#checkinDate').value;
    const time = overlay.querySelector('#checkinTime').value;
    const location = overlay.querySelector('#checkinLocation').value.trim();
    const typeInfo = CHECKIN_TYPES.find(t => t.key === this._type) || CHECKIN_TYPES[0];
    const typeText = typeInfo.icon + ' ' + typeInfo.label + this._pet.name;

    PostStore.addPost(this._pet.id, {
      date, time, location,
      text: typeText,
      photos: [],
      videoCount: 0
    });

    // 记住地点供下次快捷选择
    this._saveLocation(location);

    Toast.show('🐾 打卡成功！', 'success');
    const savedPet = this._pet;
    this.close();
    renderPosts(savedPet);
  }
};

/* ===================================================================
   模块 J-3: PostForm — 发帖表单
   =================================================================== */
const PostForm = {
  _pet: null,
  _photos: [],
  _videoFiles: [],

  open(pet) {
    this._pet = pet;
    this._photos = [];
    this._videoFiles = [];

    let overlay = document.getElementById('postFormOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'postFormOverlay';
      overlay.className = 'post-form-overlay';
      overlay.innerHTML = this._buildHTML();
      document.body.appendChild(overlay);

      overlay.querySelector('.post-form-close').addEventListener('click', () => this.close());
      overlay.addEventListener('click', e => { if (e.target === overlay) this.close(); });
      this._bindEvents(overlay);
    }

    // 重置
    overlay.querySelector('#postText').value = '';
    overlay.querySelector('#postLocation').value = '';
    overlay.querySelector('#postDate').value = new Date().toISOString().split('T')[0];
    overlay.querySelector('#postTime').value = '';
    this._photos = [];
    this._videoFiles = [];
    this._renderPreviews(overlay);

    overlay.classList.add('open');
  },

  close() {
    const overlay = document.getElementById('postFormOverlay');
    if (overlay) overlay.classList.remove('open');
    this._pet = null;
  },

  _buildHTML() {
    return `
    <div class="post-form">
      <div class="post-form-header">
        <span class="post-form-title">📝 发布新记录</span>
        <button class="post-form-close">✕</button>
      </div>

      <div class="post-form-row">
        <div class="form-group">
          <label class="form-label">📅 日期</label>
          <input class="form-input" id="postDate" type="date">
        </div>
        <div class="form-group">
          <label class="form-label">🕐 时间</label>
          <input class="form-input" id="postTime" type="time">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">📍 地点 (可选)</label>
        <input class="form-input" id="postLocation" placeholder="例: 小区花园 / 宠物医院 / 家里...">
      </div>

      <div class="form-group">
        <label class="form-label">💬 想说的话</label>
        <textarea class="form-textarea" id="postText" placeholder="记录毛孩子的今天..." rows="3"></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">📸 照片 (可多张)</label>
        <div class="post-photo-preview" id="postPhotoPreview"></div>
        <input type="file" id="postPhotoInput" accept="image/*" multiple style="display:none;">
      </div>

      <div class="form-group">
        <label class="form-label">🎬 视频 (可多段，每段≤100MB)</label>
        <div class="post-video-preview" id="postVideoPreview" style="display:none;"></div>
        <button class="video-add-btn" id="postVideoBtn">📹 添加视频</button>
        <input type="file" id="postVideoInput" accept="video/*" style="display:none;">
      </div>

      <button class="post-submit-btn" id="postSubmitBtn">💾 发布记录</button>
    </div>`;
  },

  _bindEvents(overlay) {
    // 照片
    const photoInput = overlay.querySelector('#postPhotoInput');
    overlay.querySelector('#postPhotoPreview').addEventListener('click', (e) => {
      if (e.target.closest('.post-form-add-photo') || e.target.closest('.preview-del')) return;
      // Clicking the preview area itself does nothing
    });
    // 添加照片按钮（动态生成）
    overlay.querySelector('#postPhotoInput').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        if (this._photos.length >= 9) break;
        try {
          const dataUrl = await compressImage(file, 600, 600, 0.7);
          this._photos.push(dataUrl);
        } catch (err) {
          Toast.show('照片处理失败', 'error');
        }
      }
      this._renderPreviews(overlay);
      photoInput.value = '';
    });

    // 视频（支持多段）
    const videoInput = overlay.querySelector('#postVideoInput');
    overlay.querySelector('#postVideoBtn').addEventListener('click', () => videoInput.click());
    videoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 100 * 1024 * 1024) {
        Toast.show('视频不能超过100MB哦~', 'error');
        videoInput.value = '';
        return;
      }
      if (this._videoFiles.length >= 5) {
        Toast.show('最多添加5段视频', 'error');
        videoInput.value = '';
        return;
      }
      this._videoFiles.push(file);
      this._renderPreviews(overlay);
      videoInput.value = '';
    });

    // 提交
    overlay.querySelector('#postSubmitBtn').addEventListener('click', () => this._submit());
  },

  _renderPreviews(overlay) {
    // 照片预览
    const preview = overlay.querySelector('#postPhotoPreview');
    preview.innerHTML = this._photos.map((p, i) => `
      <div class="preview-item" style="background-image:url(${p})">
        <span class="preview-del" data-idx="${i}">✕</span>
      </div>
    `).join('');

    if (this._photos.length < 9) {
      preview.innerHTML += '<div class="post-form-add-photo" id="postAddPhotoBtn">+</div>';
    }

    // 绑定删除和添加
    preview.querySelectorAll('.preview-del').forEach(del => {
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(del.dataset.idx);
        this._photos.splice(idx, 1);
        this._renderPreviews(overlay);
      });
    });
    const addBtn = preview.querySelector('#postAddPhotoBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => overlay.querySelector('#postPhotoInput').click());
    }

    // 视频预览
    const vidPreview = overlay.querySelector('#postVideoPreview');
    if (this._videoFiles.length > 0) {
      vidPreview.style.display = 'flex';
      vidPreview.style.flexDirection = 'column';
      vidPreview.style.gap = '6px';
      vidPreview.innerHTML = this._videoFiles.map((f, i) =>
        `✅ ${f.name} <span class="video-remove-btn" data-vidx="${i}">移除</span>`
      ).join('<br>');
      vidPreview.querySelectorAll('.video-remove-btn').forEach(btn => {
        btn.onclick = () => {
          this._videoFiles.splice(parseInt(btn.dataset.vidx), 1);
          this._renderPreviews(overlay);
        };
      });
    } else {
      vidPreview.style.display = 'none';
    }
  },

  async _submit() {
    const overlay = document.getElementById('postFormOverlay');
    if (!overlay || !this._pet) return;

    const text = overlay.querySelector('#postText')?.value?.trim() || '';
    const location = overlay.querySelector('#postLocation')?.value?.trim() || '';
    const date = overlay.querySelector('#postDate')?.value || new Date().toISOString().split('T')[0];
    const time = overlay.querySelector('#postTime')?.value || '';

    if (!text && this._photos.length === 0 && this._videoFiles.length === 0) {
      Toast.show('至少写一句话、传一张照片或一段视频哦~', 'error');
      return;
    }

    const post = PostStore.addPost(this._pet.id, {
      date, time, location, text,
      photos: [...this._photos],
      videoCount: this._videoFiles.length
    });

    // 保存多段视频到 IndexedDB
    for (let i = 0; i < this._videoFiles.length; i++) {
      try {
        await VideoDB.save('post_video_' + post.id + '_' + i, this._videoFiles[i]);
      } catch (e) {
        console.error('视频' + i + '保存失败:', e);
      }
    }

    Toast.show('📝 记录发布成功！', 'success');
    const savedPet = this._pet;
    this.close();
    renderPosts(savedPet);
  }
};

/* ===================================================================
   模块 K: 热敏小票生成器 (升级版)
   =================================================================== */
async function generateReceipt(pet) {
  const printZone = document.getElementById('receiptPrintZone');
  const overlay = document.getElementById('receiptOverlay');
  const receiptImg = document.getElementById('receiptImage');
  const generateBtn = document.getElementById('generateBtn');

  if (!printZone || !overlay || !receiptImg) return;

  if (generateBtn) {
    generateBtn.textContent = '⏳ 小票打印中...';
    generateBtn.style.opacity = '0.6';
    generateBtn.style.pointerEvents = 'none';
  }

  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  // 条形码线
  const barLines = Array.from({length: 60}, () => {
    const h = 8 + Math.random() * 24;
    return `<span class="bar" style="height:${h}px;"></span>`;
  }).join('');

  const coverPhoto = (pet.photos && pet.photos.length > 0) ? pet.photos[pet.coverIndex || 0] : null;

  printZone.innerHTML = `
    <div class="rz-header">
      <div class="rz-store-name">*** PET RECEIPT ***</div>
      <div class="rz-store-sub">猫咪小票 · 热敏档案</div>
      <div class="rz-store-sub">${timeStr}</div>
    </div>
    <div class="rz-avatar-area">
      ${coverPhoto ? `<img class="rz-avatar-img" src="${coverPhoto}" alt="${pet.name}">` : `<div class="rz-avatar">${pet.avatar}</div>`}
      <div class="rz-pet-name">${pet.name}</div>
    </div>
    <table class="rz-info-table">
      <tr><td>编号</td><td>${pet.id}</td></tr>
      <tr><td>品种</td><td>${pet.breed}</td></tr>
      <tr><td>年龄</td><td>${pet.age} 岁</td></tr>
      <tr><td>性别</td><td>${pet.gender}</td></tr>
      <tr><td>体重</td><td>${pet.weight}</td></tr>
      <tr><td>主人</td><td>${pet.owner}</td></tr>
      <tr><td>登记</td><td>${pet.date}</td></tr>
    </table>
    <hr class="rz-divider">
    <div class="rz-flow-line"><span class="rz-label">今日记录</span><span class="rz-divider-line"></span><span class="rz-value">罐头x1 / 贴贴x3</span></div>
    <div class="rz-flow-line"><span class="rz-label">心情指数</span><span class="rz-divider-line"></span><span class="rz-value">★★★★★</span></div>
    <div class="rz-barcode">${pet.id}</div>
    <div class="rz-barcode-lines">${barLines}</div>
    <div class="rz-qr-wrap" id="rzQrWrap"></div>
    <div class="rz-qr-caption">扫码同步主子动态</div>
    <div class="rz-footer">
      感谢使用 PET RECEIPT<br>
      用心记录每一只毛孩子 🐱✨<br>
      <span style="font-size:0.5rem;">此小票为电子档案凭证 · ${timeStr}</span>
    </div>
  `;

  // QR 码
  const qrWrap = document.getElementById('rzQrWrap');
  if (qrWrap && typeof QRCode !== 'undefined') {
    const qrCanvas = document.createElement('canvas');
    qrWrap.appendChild(qrCanvas);
    try {
      await QRCode.toCanvas(qrCanvas, `${pet.id} | ${pet.name}`, {
        width: 80, margin: 1,
        color: { dark: '#1a1a1a', light: '#f2f2f2' }
      });
    } catch (e) {
      qrWrap.innerHTML = `<div style="font-size:0.55rem;color:#999;">[ QR: ${pet.id} ]</div>`;
    }
  } else if (qrWrap) {
    qrWrap.innerHTML = `<div style="font-size:0.55rem;color:#999;">[ QR: ${pet.id} ]</div>`;
  }

  await new Promise(r => setTimeout(r, 400));

  // html2canvas 捕获
  if (typeof html2canvas !== 'undefined') {
    try {
      const canvas = await html2canvas(printZone, {
        scale: 2, useCORS: true,
        backgroundColor: '#f2f2f2', logging: false
      });
      receiptImg.src = canvas.toDataURL('image/png');
    } catch (e) {
      console.error('html2canvas 失败:', e);
      receiptImg.src = '';
    }
  }

  overlay.classList.add('visible');

  if (generateBtn) {
    generateBtn.textContent = '🖨️ 重新生成小票';
    generateBtn.style.opacity = '1';
    generateBtn.style.pointerEvents = 'auto';
  }

  // 记录为帖子
  PostStore.addPost(pet.id, {
    date: timeStr.split(' ')[0],
    time: timeStr.split(' ')[1],
    location: '',
    text: `🧾 生成了${pet.name}的热敏小票`,
    photos: receiptImg.src ? [receiptImg.src] : [],
    videoCount: 0
  });
  renderPosts(pet);

  // 全局记录
  records.push({ petId: pet.id, generatedAt: timeStr, dataUrl: receiptImg.src });
  saveRecords();
}

/* ===================================================================
   模块 L: 页面路由
   =================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  const isDetailPage = document.getElementById('petDetail') !== null;
  const isIndexPage = document.getElementById('petGrid') !== null;

  // 初始化云端同步
  initSync();

  if (isDetailPage) initDetailPage();
  else if (isIndexPage) initIndexPage();

  // 键盘快捷键
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      FormManager.close();
      DeleteConfirm.close();
      const ro = document.getElementById('receiptOverlay');
      if (ro) ro.classList.remove('visible');
    }
  });
});

/* ===================================================================
   模块 M: 云端同步初始化 & UI
   =================================================================== */
function initSync() {
  const syncBtn = document.getElementById('syncSettingsBtn');
  if (!syncBtn) return;

  const RAW = 'https://raw.githubusercontent.com/wyf040606/pet-receipt/main/pets-data.json';
  const API = 'https://api.github.com/repos/wyf040606/pet-receipt/contents/pets-data.json';

  function getToken() { return localStorage.getItem('gh_sync_token'); }
  function setToken(t) { localStorage.setItem('gh_sync_token', t); }

  syncBtn.classList.add('active');
  syncBtn.title = '☁️ 拉取中...';
  syncBtn.textContent = '⏳';

  // 1. 自动从云端合并数据（云端+本地合并，不覆盖）
  fetch(RAW + '?t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(cloud => {
      if (cloud && cloud.pets && cloud.pets.length > 0) {
        // 合并：云端有而本地没有的 → 加入；两边都有的 → 保留本地（本地更新）
        var localPets = PetStore.getAll();
        var cloudMap = {};
        cloud.pets.forEach(function(p) { cloudMap[p.id] = p; });
        var localMap = {};
        localPets.forEach(function(p) { localMap[p.id] = p; });
        // 把云端有但本地没有的加进来
        cloud.pets.forEach(function(p) {
          if (!localMap[p.id]) { localPets.push(p); }
        });
        PetStore.save(localPets); refreshPets();
        if (cloud.records) {
          var localRecs = JSON.parse(localStorage.getItem('pet_receipt_records')||'[]');
          var mergedRecs = localRecs.concat(cloud.records.filter(function(r){ return !localRecs.some(function(l){ return l.date===r.date && l.text===r.text; }); }));
          localStorage.setItem('pet_receipt_records', JSON.stringify(mergedRecs));
        }
        if (document.getElementById('petGrid')) initIndexPage();
        if (document.getElementById('petDetail')) initDetailPage();
        syncBtn.title = '☁️ 已合并';
        syncBtn.textContent = '✅';
        setTimeout(function(){ syncBtn.textContent = '☁️'; }, 2000);
      } else {
        syncBtn.title = getToken() ? '☁️ 就绪' : '☁️ 点击设置';
        syncBtn.textContent = '☁️';
      }
    })
    .catch(function() {
      syncBtn.title = '☁️ 离线';
      syncBtn.textContent = '☁️';
    });

  // 2. 推送函数
  async function pushToCloud() {
    const token = getToken();
    if (!token) return false;
    try {
      const data = { pets: PetStore.getAll(), records: JSON.parse(localStorage.getItem('pet_receipt_records')||'[]'), updatedAt: new Date().toISOString() };
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
      let sha = null;
      try { const r = await fetch(API, { headers: { Authorization: 'token ' + token } }); if (r.ok) { const i = await r.json(); sha = i.sha; } } catch(e) {}
      const body = { message: '☁️ 自动同步', content };
      if (sha) body.sha = sha;
      const r = await fetch(API, { method: 'PUT', headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return r.ok;
    } catch(e) { return false; }
  }

  // 3. 有 Token 就自动推送
  if (getToken()) {
    window._triggerSync = () => { pushToCloud(); };
  }

  // 4. 点击 ☁️
  syncBtn.addEventListener('click', () => {
    if (getToken()) {
      // 已有 Token → 推送
      syncBtn.textContent = '⏳';
      pushToCloud().then(ok => {
        syncBtn.textContent = '☁️';
        if (ok) Toast.show('☁️ 已同步到云端！', 'success');
        else {
          // API 不通 → 手动复制
          const data = { pets: PetStore.getAll(), records: JSON.parse(localStorage.getItem('pet_receipt_records')||'[]'), exportedAt: new Date().toISOString() };
          showCopyDialog(JSON.stringify(data, null, 2));
        }
      });
    } else {
      // 没 Token → 输入
      showTokenDialog((token) => {
        setToken(token);
        window._triggerSync = () => { pushToCloud(); };
        syncBtn.title = '☁️ 就绪（自动同步中）';
        pushToCloud().then(ok => {
          if (ok) Toast.show('☁️ 同步已开启！', 'success');
          else Toast.show('API 不通，请开 VPN 后重试', 'error');
        });
      });
    }
  });
}


function showTokenDialog(onSave) {
  var overlay = document.getElementById('syncTokenDialog');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'syncTokenDialog';
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = '<div class="confirm-dialog" style="max-width:90vw;width:340px;text-align:left;"><div style="font-size:1.1rem;margin-bottom:10px;">🔑 输入 GitHub Token</div><p style="font-size:0.72rem;color:var(--ink-secondary);margin-bottom:10px;">Token 仅存此设备浏览器中，不会上传。</p><input class="form-input" id="tokenInput" placeholder="ghp_xxxxxxxxxxxx" style="margin-bottom:12px;font-size:0.8rem;"><div style="display:flex;gap:8px;"><button class="confirm-cancel" id="tokenCancel" style="flex:1;">取消</button><button class="confirm-delete" id="tokenSave" style="flex:1;background:var(--tag-comm-text);">保存</button></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.classList.remove('open'); });
  }
  overlay.querySelector('#tokenCancel').onclick = function() { overlay.classList.remove('open'); };
  overlay.querySelector('#tokenSave').onclick = function() {
    var t = overlay.querySelector('#tokenInput').value.trim();
    if (!t) { Toast.show('请输入 Token', 'error'); return; }
    overlay.classList.remove('open');
    onSave(t);
  };
  overlay.classList.add('open');
}

function showCopyDialog(jsonStr) {
  var overlay = document.getElementById('syncCopyDialog');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'syncCopyDialog';
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = '<div class="confirm-dialog" style="max-width:90vw;width:360px;text-align:left;"><div style="font-size:1rem;margin-bottom:10px;">📋 复制数据发给我</div><textarea id="syncDataText" readonly style="width:100%;height:200px;font-size:0.65rem;font-family:monospace;padding:8px;border:1px solid var(--border-soft);border-radius:var(--radius-sm);resize:none;"></textarea><div style="display:flex;gap:8px;margin-top:10px;"><button class="confirm-cancel" id="syncCopyClose" style="flex:1;">关闭</button><button class="confirm-delete" id="syncCopyBtn" style="flex:1;background:var(--tag-comm-text);">📋 一键复制</button></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.classList.remove('open'); });
  }
  overlay.querySelector('#syncDataText').value = jsonStr;
  overlay.querySelector('#syncCopyClose').onclick = function() { overlay.classList.remove('open'); };
  overlay.querySelector('#syncCopyBtn').onclick = function() {
    var ta = overlay.querySelector('#syncDataText');
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    try { navigator.clipboard.writeText(ta.value); } catch(e) {}
    Toast.show('✅ 已复制！发给我帮你同步', 'success');
    overlay.classList.remove('open');
  };
  overlay.classList.add('open');
}
