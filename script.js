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

    const tagsHTML = (pet.featureTags || []).slice(0, 3).map(t =>
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
        <div class="cover-hint">💡 点击照片可设为封面头像</div>
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

    <div class="video-player-wrap" id="videoPlayerWrap" style="display:none;"></div>
  `;

  // 时光轴
  renderTimeline(pet);

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
  if (pet.category === 'community' && pet.status === 'active') {
    fab = document.createElement('button');
    fab.id = 'communityFab';
    fab.className = 'community-fab';
    fab.textContent = '🐾';
    fab.title = '偶遇打卡';
    fab.onclick = () => {
      const now = new Date().toISOString().split('T')[0];
      const timeline = JSON.parse(localStorage.getItem('pet_timeline_' + pet.id) || '[]');
      timeline.push({ date: now, text: '📸 有人在' + (pet.location || '附近') + '偶遇了' + pet.name + '！', type: 'checkin' });
      localStorage.setItem('pet_timeline_' + pet.id, JSON.stringify(timeline));
      Toast.show('🐾 打卡成功！已记录偶遇', 'success');
      renderTimeline(pet);
    };
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

  // 视频加载
  if (pet.hasVideo) {
    loadDetailVideo(pet.id);
  }
}

/* ===================================================================
   模块 I-extra: 视频加载
   =================================================================== */
async function loadDetailVideo(petId) {
  const wrap = document.getElementById('videoPlayerWrap');
  if (!wrap) return;
  try {
    const record = await VideoDB.get(petId);
    if (!record || !record.data) { wrap.style.display = 'none'; return; }
    const url = URL.createObjectURL(record.data);
    wrap.style.display = 'block';
    wrap.innerHTML = `
      <video controls playsinline preload="metadata"
             style="width:100%;max-height:240px;display:block;background:#000;border-radius:var(--radius-sm);">
        <source src="${url}" type="${record.type || 'video/mp4'}">
        你的浏览器不支持视频播放
      </video>`;
  } catch (e) {
    wrap.style.display = 'none';
  }
}

/* ===================================================================
   模块 J: 时光轴渲染
   =================================================================== */
function renderTimeline(pet) {
  const section = document.getElementById('timelineSection');
  if (!section) return;

  const timeline = JSON.parse(localStorage.getItem('pet_timeline_' + pet.id) || '[]');

  if (timeline.length === 0) {
    section.innerHTML = `
      <div class="timeline-title">📜 时光轴</div>
      <div class="timeline-axis">
        <div class="timeline-empty">还没有记录～<br>生成第一张小票就会出现在这里 ✨</div>
      </div>`;
    return;
  }

  const cardsHTML = timeline.sort((a, b) => b.date.localeCompare(a.date)).map((item, i) => `
    <div style="position:relative;">
      <span class="timeline-node">🐾</span>
      <div class="timeline-card">
        <div class="tl-date">${item.date}</div>
        <div class="tl-content">${item.text}</div>
      </div>
    </div>
  `).join('');

  section.innerHTML = `
    <div class="timeline-title">📜 时光轴 · ${timeline.length} 条记录</div>
    <div class="timeline-axis">${cardsHTML}</div>`;
}

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

  // 记录到时光轴
  const timeline = JSON.parse(localStorage.getItem('pet_timeline_' + pet.id) || '[]');
  timeline.push({ date: timeStr.split(' ')[0], text: `🧾 生成了${pet.name}的热敏小票` });
  localStorage.setItem('pet_timeline_' + pet.id, JSON.stringify(timeline));
  renderTimeline(pet);

  // 全局记录
  records.push({ petId: pet.id, generatedAt: timeStr, dataUrl: receiptImg.src });
  saveRecords();
}

/* ===================================================================
   模块 L: 页面路由
   =================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const isDetailPage = document.getElementById('petDetail') !== null;
  const isIndexPage = document.getElementById('petGrid') !== null;

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
