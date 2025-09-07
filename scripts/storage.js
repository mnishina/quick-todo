/**
 * Quick TODO アプリ - データ管理クラス
 * localStorage を使用したデータ永続化
 * XSS対策とエラーハンドリングを含む
 */

/**
 * UUID生成ユーティリティ
 * @returns {string} UUID文字列
 */
function generateUUID() {
  return 'todo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

/**
 * 入力処理ユーティリティクラス
 * カンマ区切り文字列の解析とサニタイゼーション
 */
class InputProcessor {
  /**
   * 区切り文字列を配列に変換（半角・全角カンマ、読点、混在パターン対応）
   * @param {string} text - 入力文字列
   * @returns {string[]} サニタイズされた文字列配列
   */
  static parseInput(text) {
    if (!text || typeof text !== 'string') {
      return []
    }

    // 複数の区切り文字に同時対応（混在パターン対応）
    // 正規表現で全ての区切り文字パターンを一度に処理
    const separatorRegex = /[,，、\uFF0C]/

    let items = []
    if (separatorRegex.test(text)) {
      // いずれかの区切り文字が含まれている場合、正規表現で分割
      items = text.split(/[,，、\uFF0C]/)
    } else {
      // 区切り文字がない場合は単一アイテム
      items = [text]
    }

    // サニタイズとフィルタリング
    return items
      .map(item => this.sanitizeItem(item))
      .filter(item => item.length > 0)
  }

  /**
   * 個別アイテムのサニタイゼーション
   * @param {string} text - アイテムテキスト
   * @returns {string} サニタイズされたテキスト
   */
  static sanitizeItem(text) {
    if (!text || typeof text !== 'string') {
      return ''
    }

    return text.trim().replace(/\s+/g, ' ').slice(0, 200)
  }

  /**
   * HTMLエスケープ（XSS対策）
   * @param {string} text - エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  static escapeHtml(text) {
    if (!text || typeof text !== 'string') {
      return ''
    }

    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

/**
 * TODOデータ管理クラス
 * localStorage を使用したCRUD操作
 */
class TodoStorage {
  static STORAGE_KEY = 'quickTodoList'
  static VERSION = '1.0.0'

  /**
   * デフォルトデータ構造
   * @returns {Object} デフォルトデータ
   */
  static getDefaultData() {
    return {
      version: this.VERSION,
      items: [],
      lastUpdated: new Date().toISOString(),
      settings: {
        theme: 'auto',
        animations: true,
      },
    }
  }

  /**
   * localStorage からデータを読み込み
   * @returns {Object} TODOデータ
   */
  static load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)

      if (!data) {
        return this.getDefaultData()
      }

      const parsed = JSON.parse(data)

      if (!parsed || !Array.isArray(parsed.items)) {
        console.warn('Invalid data format, using default data')
        return this.getDefaultData()
      }

      return {
        ...this.getDefaultData(),
        ...parsed,
        items: parsed.items
          .map(item => this.validateItem(item))
          .filter(Boolean),
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error)
      return this.getDefaultData()
    }
  }

  /**
   * データを localStorage に保存
   * @param {Object} data - 保存するデータ
   * @returns {boolean} 保存成功フラグ
   */
  static save(data) {
    try {
      if (!data || !Array.isArray(data.items)) {
        console.error('Invalid data format')
        return false
      }

      const dataToSave = {
        ...data,
        lastUpdated: new Date().toISOString(),
        version: this.VERSION,
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave))
      return true
    } catch (error) {
      console.error('Failed to save data to localStorage:', error)

      if (error.name === 'QuotaExceededError') {
        this.handleStorageQuotaExceeded()
      }

      return false
    }
  }

  /**
   * アイテムのバリデーション
   * @param {Object} item - バリデートするアイテム
   * @returns {Object|null} バリデート済みアイテムまたはnull
   */
  static validateItem(item) {
    if (!item || typeof item !== 'object') {
      return null
    }

    return {
      id: item.id || generateUUID(),
      text: InputProcessor.sanitizeItem(item.text || ''),
      completed: Boolean(item.completed),
      createdAt: item.createdAt || new Date().toISOString(),
    }
  }

  /**
   * 単一アイテムを追加
   * @param {string} text - アイテムテキスト
   * @returns {Object|null} 追加されたアイテムまたはnull
   */
  static addItem(text) {
    const sanitized = InputProcessor.sanitizeItem(text)
    if (!sanitized) {
      return null
    }

    const data = this.load()
    const newItem = {
      id: generateUUID(),
      text: sanitized,
      completed: false,
      createdAt: new Date().toISOString(),
    }

    data.items.push(newItem)

    if (this.save(data)) {
      return newItem
    }

    return null
  }

  /**
   * 複数アイテムを一括追加
   * @param {string[]} textArray - アイテムテキスト配列
   * @returns {Object[]} 追加されたアイテム配列
   */
  static addItems(textArray) {
    if (!Array.isArray(textArray)) {
      return []
    }

    const data = this.load()
    const newItems = []

    for (const text of textArray) {
      const sanitized = InputProcessor.sanitizeItem(text)
      if (sanitized) {
        const newItem = {
          id: generateUUID(),
          text: sanitized,
          completed: false,
          createdAt: new Date().toISOString(),
        }

        data.items.push(newItem)
        newItems.push(newItem)
      }
    }

    if (newItems.length > 0) {
      this.save(data)
    }

    return newItems
  }

  /**
   * アイテムを更新
   * @param {string} id - アイテムID
   * @param {Object} updates - 更新内容
   * @returns {Object|null} 更新されたアイテムまたはnull
   */
  static updateItem(id, updates) {
    const data = this.load()
    const itemIndex = data.items.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return null
    }

    const updatedItem = {
      ...data.items[itemIndex],
      ...updates,
      id,
      text: updates.text
        ? InputProcessor.sanitizeItem(updates.text)
        : data.items[itemIndex].text,
    }

    data.items[itemIndex] = this.validateItem(updatedItem)

    if (this.save(data)) {
      return data.items[itemIndex]
    }

    return null
  }

  /**
   * アイテムを削除
   * @param {string} id - アイテムID
   * @returns {boolean} 削除成功フラグ
   */
  static deleteItem(id) {
    const data = this.load()
    const initialLength = data.items.length

    data.items = data.items.filter(item => item.id !== id)

    if (data.items.length < initialLength) {
      return this.save(data)
    }

    return false
  }

  /**
   * すべてのアイテムを削除
   * @returns {boolean} 削除成功フラグ
   */
  static clearAll() {
    const data = this.getDefaultData()
    return this.save(data)
  }

  /**
   * データのエクスポート
   * @returns {string} JSON文字列
   */
  static exportData() {
    const data = this.load()
    return JSON.stringify(data, null, 2)
  }

  /**
   * データのインポート
   * @param {string} jsonString - JSON文字列
   * @returns {boolean} インポート成功フラグ
   */
  static importData(jsonString) {
    try {
      const data = JSON.parse(jsonString)

      if (!data || !Array.isArray(data.items)) {
        throw new Error('Invalid data format')
      }

      const validatedData = {
        ...this.getDefaultData(),
        ...data,
        items: data.items.map(item => this.validateItem(item)).filter(Boolean),
      }

      return this.save(validatedData)
    } catch (error) {
      console.error('Failed to import data:', error)
      return false
    }
  }

  /**
   * ストレージ容量超過時の処理
   * @private
   */
  static handleStorageQuotaExceeded() {
    console.warn('localStorage quota exceeded')

    try {
      const data = this.load()

      if (data.items.length > 100) {
        const recentItems = data.items
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 50)

        data.items = recentItems
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))

        console.info('Reduced items to 50 most recent entries')
      }
    } catch (error) {
      console.error('Failed to handle storage quota exceeded:', error)
    }
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  static getDebugInfo() {
    const data = this.load()

    return {
      version: this.VERSION,
      storageKey: this.STORAGE_KEY,
      dataSize: JSON.stringify(data).length,
      lastUpdated: data.lastUpdated,
      storageAvailable: this.isStorageAvailable(),
      items: data.items.map(item => ({
        id: item.id,
        textLength: item.text.length,
        completed: item.completed,
        createdAt: item.createdAt,
      })),
    }
  }

  /**
   * localStorage が利用可能かチェック
   * @returns {boolean} 利用可能フラグ
   */
  static isStorageAvailable() {
    try {
      const testKey = '__storage_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }
}

window.TodoStorage = TodoStorage
window.InputProcessor = InputProcessor
