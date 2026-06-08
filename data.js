/**
 * 猫咪小票 v2.1 — 数据层
 * PetStore CRUD + localStorage 持久化 + Figma 设计系统对齐
 * + 照片(base64) & 视频(IndexedDB) 支持
 */

/* ========== 宠物类型映射 ========== */
const PET_TYPES = {
  cat:    { label: '🐱 猫咪', prefix: 'CAT',    emoji: '🐱', color: '#FBE9E7' },
  dog:    { label: '🐶 狗狗', prefix: 'DOG',    emoji: '🐶', color: '#E3F2FD' },
  rabbit: { label: '🐰 兔兔', prefix: 'RABBIT', emoji: '🐰', color: '#FCE4EC' },
  hamster:{ label: '🐹 仓鼠', prefix: 'HAMSTR', emoji: '🐹', color: '#FFF3E0' },
  bird:   { label: '🐦 小鸟', prefix: 'BIRD',   emoji: '🐦', color: '#E8F5E9' },
  fish:   { label: '🐟 鱼儿', prefix: 'FISH',   emoji: '🐟', color: '#E0F7FA' },
  other:  { label: '✨ 其他', prefix: 'OTHER',  emoji: '✨', color: '#F3E5F5' }
};

/* ========== 品种预设库 ========== */
const BREED_PRESETS = {
  cat:     ['狸花猫','三花猫','虎斑猫','英短','美短','布偶猫','暹罗猫','橘猫','奶牛猫','黑猫','白猫','玳瑁猫','中华田园猫','加菲猫','金吉拉','缅因猫','波斯猫','德文卷毛','阿比西尼亚','无毛猫'],
  dog:     ['柴犬','金毛','柯基','哈士奇','拉布拉多','比熊','泰迪','边牧','萨摩耶','法斗','德国牧羊犬','博美','雪纳瑞','约克夏','巴哥','松狮','银狐','杜宾','罗威纳','秋田'],
  rabbit:  ['荷兰垂耳兔','荷兰侏儒兔','安哥拉兔','狮子兔','雷克斯兔','迷你兔','道奇兔','暹罗兔','蝴蝶兔','银狐兔'],
  hamster: ['金丝熊','银狐仓鼠','布丁仓鼠','奶茶仓鼠','紫仓','三线仓鼠','一线仓鼠','老公公仓鼠','熊仔','花仓'],
  bird:    ['虎皮鹦鹉','玄凤鹦鹉','牡丹鹦鹉','金丝雀','文鸟','相思鸟','画眉','八哥','百灵鸟','珍珠鸟'],
  fish:    ['锦鲤','金鱼','斗鱼','龙鱼','孔雀鱼','灯科鱼','神仙鱼','七彩神仙','罗汉鱼','锦鲫'],
  other:   ['自定义品种']
};

/* ========== 特征标签库 ========== */
const FEATURE_TAGS = {
  cat:     ['贪吃','粘人','话痨','高冷','社牛','胆小鬼','跑酷王','踩奶大师','咕噜怪','纸箱控','键盘侠','吃货','撒娇精','自来熟','傲娇'],
  dog:     ['贪吃','拆家','飞盘高手','游泳健将','看家能手','撒娇精','社交达人','跟屁虫','微笑天使','戏精'],
  rabbit:  ['贪吃','软萌','蹦蹦跳','爱打洞','粘人精','胆小','好奇宝宝','纸箱控','草食系','洁癖'],
  hamster: ['贪吃','屯粮大师','跑轮狂魔','昼伏夜出','独居主义','颊囊满载','越狱高手','胆小','爱打洞','软萌'],
  bird:    ['话痨','歌唱家','粘人','聪明','好奇宝宝','爱模仿','爱干净','挑食','早起鸟','社牛'],
  fish:    ['优雅','贪吃','群游','领地意识','色彩斑斓','好养','活泼','胆小','长寿','挑食'],
  other:   ['可爱','贪吃','粘人','活泼','安静','胆小','好奇','社牛','傲娇','撒娇精']
};

/* ========== Emoji 头像库 ========== */
const AVATAR_EMOJIS = {
  cat:     ['🐱','🐈','😺','😸','😻','🐈‍⬛','🦁','🐯','🐾','😽','🙀','😿'],
  dog:     ['🐕','🐶','🐩','🦮','🐕‍🦺','🐾','🦊','🐺'],
  rabbit:  ['🐰','🐇','🐾','🥕','🌸','🍀','💕'],
  hamster: ['🐹','🐭','🐾','🌰','🐿️','🦔','💤'],
  bird:    ['🐦','🐤','🐥','🦜','🕊️','🦅','🐾','🎵'],
  fish:    ['🐟','🐠','🐡','🦈','🐙','🦀','🐚','💧'],
  other:   ['✨','❤️','🌟','🦎','🐢','🐍','🦔','🦦']
};

/* ===================================================================
   图片压缩工具 (Canvas resize + compress for localStorage)
   =================================================================== */
function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // 圆角裁剪 (轻微)
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/* ===================================================================
   VideoDB — IndexedDB 视频存储 (视频文件较大，不适合 localStorage)
   =================================================================== */
const VideoDB = {
  DB_NAME: 'pet_receipt_videos',
  STORE_NAME: 'videos',

  _open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(this.STORE_NAME)) {
          req.result.createObjectStore(this.STORE_NAME, { keyPath: 'petId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async save(petId, file) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).put({
        petId,
        data: file,
        type: file.type,
        name: file.name,
        savedAt: new Date().toISOString()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async get(petId) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const req = tx.objectStore(this.STORE_NAME).get(petId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async remove(petId) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).delete(petId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /** 将存储的 File 对象转为可播放的 URL */
  async getURL(petId) {
    const record = await this.get(petId);
    if (!record || !record.data) return null;
    return URL.createObjectURL(record.data);
  }
};

/* ===================================================================
   PetStore — 数据仓库 (localStorage CRUD)
   =================================================================== */

const PetStore = {
  STORAGE_KEY: 'pet_receipt_v2_data',

  /** 默认数据（首次使用 / 重置时） */
  getDefaults() {
    return [
      {
        id: 'NO.2026-CAT-01',
        name: '小花',
        type: 'cat',
        breed: '狸花猫',
        age: 2,
        gender: '♀',
        weight: '4.2kg',
        themeColor: '#D4956B',
        complementBg: '#FFF5EE',
        avatar: '🐈',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '小王',
        date: '2026-06-06',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['贪吃','粘人','踩奶大师'],
        favoriteFood: '鸡胸肉条',
        personality: '活泼好动，喜欢追逐激光笔',
        notes: '已完成驱虫与三联疫苗接种'
      },
      {
        id: 'NO.2026-CAT-02',
        name: '团团',
        type: 'cat',
        breed: '三花猫',
        age: 1,
        gender: '♀',
        weight: '3.5kg',
        themeColor: '#F0A8B8',
        complementBg: '#FFF0F3',
        avatar: '🐱',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '小李',
        date: '2026-05-20',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['粘人','撒娇精','纸箱控'],
        favoriteFood: '三文鱼罐头',
        personality: '粘人精，喜欢窝在主人腿上睡觉',
        notes: '已做体内外驱虫'
      },
      {
        id: 'NO.2026-CAT-03',
        name: '大橘',
        type: 'cat',
        breed: '橘猫',
        age: 4,
        gender: '♂',
        weight: '7.8kg',
        themeColor: '#E8943A',
        complementBg: '#FFF8F0',
        avatar: '🦁',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '老张',
        date: '2026-03-15',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['贪吃','吃货','社牛'],
        favoriteFood: '一切能吃的',
        personality: '不是在吃就是在去吃的路上',
        notes: '体重偏重，建议控制饮食'
      },
      {
        id: 'NO.2026-CAT-04',
        name: '雪球',
        type: 'cat',
        breed: '布偶猫',
        age: 3,
        gender: '♀',
        weight: '5.1kg',
        themeColor: '#B8C5D6',
        complementBg: '#F5F7FA',
        avatar: '😻',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: 'Anna',
        date: '2026-06-01',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['傲娇','高冷','咕噜怪'],
        favoriteFood: '鳕鱼冻干',
        personality: '优雅高贵，蓝色大眼睛会说话',
        notes: '纯种布偶，定期美容护理'
      },
      {
        id: 'NO.2026-CAT-05',
        name: '虎子',
        type: 'cat',
        breed: '虎斑猫',
        age: 5,
        gender: '♂',
        weight: '5.6kg',
        themeColor: '#8B9A6E',
        complementBg: '#F4F6F0',
        avatar: '🐯',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '大刘',
        date: '2026-02-28',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['跑酷王','胆小鬼','话痨'],
        favoriteFood: '牛肉粒',
        personality: '外表威武内心软萌，怕打雷',
        notes: '已绝育，健康状况良好'
      },
      {
        id: 'NO.2026-CAT-06',
        name: '狸花学长',
        type: 'cat',
        breed: '狸花猫',
        age: 3,
        gender: '♂',
        weight: '5.0kg',
        themeColor: '#A0A0A0',
        complementBg: '#F5F5F0',
        avatar: '🐈',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '全体同学',
        date: '2026-04-10',
        status: 'active',
        category: 'community',
        location: '图书馆前草坪',
        featureTags: ['社牛','自来熟','吃货'],
        favoriteFood: '同学们投喂的猫条',
        personality: '校园明星猫咪，见谁蹭谁',
        notes: '已做TNR，左耳有剪耳标记'
      },
      {
        id: 'NO.2026-CAT-07',
        name: '煤球',
        type: 'cat',
        breed: '黑猫',
        age: 1,
        gender: '♂',
        weight: '4.0kg',
        themeColor: '#4A4A4A',
        complementBg: '#F8F8F8',
        avatar: '🐈‍⬛',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '小吴',
        date: '2026-05-05',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['跑酷王','键盘侠','胆小鬼'],
        favoriteFood: '金枪鱼',
        personality: '精力旺盛，凌晨三点准时跑酷',
        notes: '全黑无杂毛，黄眼睛'
      },
      {
        id: 'NO.2026-CAT-08',
        name: '老黄',
        type: 'cat',
        breed: '橘猫',
        age: 12,
        gender: '♂',
        weight: '4.5kg',
        themeColor: '#B0A090',
        complementBg: '#F0EDE8',
        avatar: '😿',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '永远的家人',
        date: '2026-01-01',
        status: 'star',
        category: 'private',
        location: '喵星球',
        featureTags: ['贪吃','粘人','踩奶大师'],
        favoriteFood: '鸡肝',
        personality: '安静温柔的老爷爷',
        notes: '陪伴了主人整个童年，已于2026年春天回喵星。永远爱你。'
      },
      {
        id: 'NO.2026-DOG-01',
        name: '旺财',
        type: 'dog',
        breed: '柴犬',
        age: 2,
        gender: '♂',
        weight: '10.5kg',
        themeColor: '#D4956B',
        complementBg: '#FFF8F2',
        avatar: '🐕',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '小周',
        date: '2026-05-30',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['贪吃','戏精','拆家'],
        favoriteFood: '鸡肉干',
        personality: '表情包担当，倔强又可爱',
        notes: '已打芯片，会握手坐下'
      },
      {
        id: 'NO.2026-DOG-02',
        name: '毛球',
        type: 'dog',
        breed: '比熊',
        age: 1,
        gender: '♀',
        weight: '4.5kg',
        themeColor: '#F5E6D3',
        complementBg: '#FFFDF9',
        avatar: '🐩',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '小杨',
        date: '2026-06-03',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['撒娇精','跟屁虫','社交达人'],
        favoriteFood: '芝士条',
        personality: '棉花糖本糖，走起路来蹦蹦跳跳',
        notes: '定期美容，毛发柔顺'
      },
      {
        id: 'NO.2026-RABBIT-01',
        name: '雪团',
        type: 'rabbit',
        breed: '荷兰垂耳兔',
        age: 1,
        gender: '♀',
        weight: '1.5kg',
        themeColor: '#F8BBD0',
        complementBg: '#FFF5F7',
        avatar: '🐰',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '小美',
        date: '2026-06-07',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['软萌','蹦蹦跳','草食系'],
        favoriteFood: '苜蓿草',
        personality: '软萌可爱，耳朵垂下来像毛绒玩具',
        notes: '每天需要放风时间，喜欢钻纸箱'
      },
      {
        id: 'NO.2026-HAMSTR-01',
        name: '团子',
        type: 'hamster',
        breed: '金丝熊',
        age: 0,
        gender: '♂',
        weight: '120g',
        themeColor: '#FFCC80',
        complementBg: '#FFF8F0',
        avatar: '🐹',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '小明',
        date: '2026-06-07',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['屯粮大师','跑轮狂魔','颊囊满载'],
        favoriteFood: '葵花籽',
        personality: '夜间活跃，喜欢把食物塞满颊囊',
        notes: '独居动物，不要和金丝熊合笼'
      },
      {
        id: 'NO.2026-BIRD-01',
        name: '翡翠',
        type: 'bird',
        breed: '虎皮鹦鹉',
        age: 2,
        gender: '♂',
        weight: '35g',
        themeColor: '#A5D6A7',
        complementBg: '#F5FAF5',
        avatar: '🦜',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '阿杰',
        date: '2026-05-15',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['话痨','聪明','爱模仿'],
        favoriteFood: '小米穗',
        personality: '聪明伶俐，会学人说话和门铃声',
        notes: '已学会说"你好"和"恭喜发财"'
      },
      {
        id: 'NO.2026-FISH-01',
        name: '红袍',
        type: 'fish',
        breed: '斗鱼',
        age: 0,
        gender: '♂',
        weight: '5g',
        themeColor: '#EF5350',
        complementBg: '#FFF0F0',
        avatar: '🐠',
        photos: [],
        coverIndex: 0,
        hasVideo: false,
        owner: '小琳',
        date: '2026-06-07',
        status: 'active',
        category: 'private',
        location: '',
        featureTags: ['优雅','领地意识','色彩斑斓'],
        favoriteFood: '丰年虾',
        personality: '鳍如火焰，独居小宫殿的水中舞者',
        notes: '泰国斗鱼，不可与其他雄鱼混养'
      }
    ];
  },

  /** 从 localStorage 加载 */
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.warn('PetStore: localStorage 读取失败，使用默认数据', e);
    }
    // 无数据则写入默认值
    const defaults = this.getDefaults();
    this.save(defaults);
    return defaults;
  },

  /** 持久化到 localStorage + 触发云端同步 */
  save(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      // 触发云端同步（如果已启用）
    } catch (e) {
      console.error('PetStore: localStorage 写入失败', e);
    }
  },

  /** 获取全部宠物 */
  getAll() {
    return this.load();
  },

  /** 生成唯一 ID */
  generateId(type) {
    const all = this.getAll();
    const typeInfo = PET_TYPES[type] || PET_TYPES['other'];
    const prefix = typeInfo.prefix;
    const sameType = all.filter(p => p.type === type);
    const maxNum = sameType.reduce((max, p) => {
      const m = p.id.match(/(\d+)$/);
      return m ? Math.max(max, parseInt(m[1])) : max;
    }, 0);
    const next = String(maxNum + 1).padStart(2, '0');
    return `NO.2026-${prefix}-${next}`;
  },

  /** 新增宠物 */
  add(petData) {
    const all = this.getAll();
    const newPet = {
      ...petData,
      id: this.generateId(petData.type || 'cat'),
      date: petData.date || new Date().toISOString().split('T')[0]
    };
    all.unshift(newPet);
    this.save(all);
    return newPet;
  },

  /** 更新宠物 */
  update(id, petData) {
    const all = this.getAll();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...petData, id }; // 禁止修改 id
    this.save(all);
    return all[idx];
  },

  /** 删除宠物 */
  delete(id) {
    const all = this.getAll();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return false;
    all.splice(idx, 1);
    this.save(all);
    return true;
  },

  /** 恢复默认数据 */
  reset() {
    const defaults = this.getDefaults();
    this.save(defaults);
    return defaults;
  }
};

/* ===================================================================
   PostStore — 帖子系统 (微博式记录，每条帖子可含多图/视频/地点)
   =================================================================== */
const PostStore = {
  /** 获取某宠物的所有帖子 (按时间倒序) */
  getPosts(petId) {
    try {
      return JSON.parse(localStorage.getItem('posts_' + petId) || '[]');
    } catch (e) { return []; }
  },

  /** 保存帖子列表 */
  savePosts(petId, posts) {
    try {
      localStorage.setItem('posts_' + petId, JSON.stringify(posts));
    } catch (e) {
      console.error('PostStore: 保存失败', e);
    }
  },

  /** 新增帖子 */
  addPost(petId, postData) {
    const posts = this.getPosts(petId);
    const post = {
      id: 'post_' + Date.now(),
      petId,
      date: postData.date || new Date().toISOString().split('T')[0],
      time: postData.time || '',
      location: postData.location || '',
      text: postData.text || '',
      photos: postData.photos || [],
      videoCount: postData.videoCount || 0,
      createdAt: new Date().toISOString()
    };
    posts.unshift(post);
    this.savePosts(petId, posts);
    return post;
  },

  /** 删除帖子 (同时清理关联视频) */
  async deletePost(petId, postId) {
    const posts = this.getPosts(petId);
    const post = posts.find(p => p.id === postId);
    if (post && post.videoCount > 0) {
      for (let i = 0; i < post.videoCount; i++) {
        await VideoDB.remove('post_video_' + postId + '_' + i).catch(() => {});
      }
    }
    const filtered = posts.filter(p => p.id !== postId);
    this.savePosts(petId, filtered);
  }
};

/* ===================================================================
   全局快捷函数（向后兼容 script.js）
   =================================================================== */

/** 运行时数据引用：首次加载从 PetStore 获取 */
let pets = PetStore.getAll();

/** 小票历史记录 */
const records = JSON.parse(localStorage.getItem('pet_receipt_records') || '[]');

function saveRecords() {
  localStorage.setItem('pet_receipt_records', JSON.stringify(records));
}

/** 刷新运行时数据 */
function refreshPets() {
  pets = PetStore.getAll();
}

function getPetById(id) {
  return PetStore.getAll().find(p => p.id === id);
}

function filterPets(type, breedQuery) {
  let result = PetStore.getAll();
  if (type && type !== 'all') {
    result = result.filter(p => p.type === type);
  }
  if (breedQuery && breedQuery.trim()) {
    const q = breedQuery.trim().toLowerCase();
    result = result.filter(p =>
      p.breed.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.featureTags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  return result;
}

function filterBreeds(type, query) {
  const breeds = BREED_PRESETS[type] || [];
  if (!query || !query.trim()) return breeds;
  const q = query.trim().toLowerCase();
  return breeds.filter(b => b.toLowerCase().includes(q));
}
