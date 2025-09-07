/**
 * Quick TODO アプリ - メイン機能
 * DOM操作、イベント処理、UI更新を含む
 * スマホ専用設計
 */

/**
 * TODOアプリのメインクラス
 */
class TodoApp {
  constructor() {
    this.elements = {}
    this.data = null
    this.isInitialized = false
    this.isComposing = false // IME変換中フラグ

    this.init()
  }

  /**
   * アプリケーション初期化
   */
  init() {
    if (this.isInitialized) {
      return
    }

    try {
      this.cacheElements()
      this.loadData()
      this.bindEvents()
      this.render()
      this.focusInput()

      this.isInitialized = true
      console.log('TodoApp initialized successfully')
    } catch (error) {
      console.error('Failed to initialize TodoApp:', error)
      this.showError('アプリケーションの初期化に失敗しました')
    }
  }

  /**
   * DOM要素をキャッシュ
   */
  cacheElements() {
    const elements = {
      todoInput: '#todo-input',
      addBtn: '#add-btn',
      todoList: '#todo-list',
      emptyState: '#empty-state',
      clearAllBtn: '#clear-all-btn',
    }

    for (const [key, selector] of Object.entries(elements)) {
      const element = document.querySelector(selector)
      if (!element) {
        throw new Error(`Required element not found: ${selector}`)
      }
      this.elements[key] = element
    }
  }

  /**
   * データを読み込み
   */
  loadData() {
    this.data = TodoStorage.load()
  }

  /**
   * データを保存
   */
  saveData() {
    return TodoStorage.save(this.data)
  }

  /**
   * イベントリスナーをバインド
   */
  bindEvents() {
    this.elements.addBtn.addEventListener(
      'click',
      this.handleAddClick.bind(this)
    )

    this.elements.todoInput.addEventListener(
      'keydown',
      this.handleInputKeydown.bind(this)
    )
    this.elements.todoInput.addEventListener(
      'paste',
      this.handleInputPaste.bind(this)
    )
    this.elements.todoInput.addEventListener(
      'compositionstart',
      this.handleCompositionStart.bind(this)
    )
    this.elements.todoInput.addEventListener(
      'compositionend',
      this.handleCompositionEnd.bind(this)
    )

    this.elements.todoList.addEventListener(
      'click',
      this.handleListClick.bind(this)
    )
    this.elements.todoList.addEventListener(
      'change',
      this.handleListChange.bind(this)
    )

    this.elements.clearAllBtn.addEventListener(
      'click',
      this.handleClearAll.bind(this)
    )

    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this))

    document.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange.bind(this)
    )

    window.addEventListener('storage', this.handleStorageChange.bind(this))
  }

  /**
   * 追加ボタンクリック処理
   */
  handleAddClick() {
    this.addTodos()
  }

  /**
   * 入力欄キーダウン処理
   */
  handleInputKeydown(event) {
    if (event.key === 'Enter') {
      // IME変換中（日本語入力中）の場合は何もしない
      if (this.isComposing || event.isComposing || event.keyCode === 229) {
        return
      }

      event.preventDefault()
      this.addTodos()
    }
  }

  /**
   * IME変換開始処理
   */
  handleCompositionStart(event) {
    this.isComposing = true
  }

  /**
   * IME変換終了処理
   */
  handleCompositionEnd(event) {
    this.isComposing = false
  }

  /**
   * 入力欄ペースト処理
   */
  handleInputPaste(event) {
    // ペースト処理（必要に応じて追加の処理を実装）
  }

  /**
   * リストクリック処理
   */
  handleListClick(event) {
    const todoItem = event.target.closest('.todo-item')
    if (!todoItem) return

    const itemId = todoItem.dataset.id

    if (event.target.classList.contains('delete-button')) {
      this.deleteTodo(itemId)
    } else if (event.target.classList.contains('todo-checkbox')) {
      this.toggleTodo(itemId)
    }
  }

  /**
   * リスト変更処理
   */
  handleListChange(event) {
    if (event.target.classList.contains('todo-checkbox')) {
      const todoItem = event.target.closest('.todo-item')
      if (todoItem) {
        const itemId = todoItem.dataset.id
        this.toggleTodo(itemId)
      }
    }
  }

  /**
   * ページ離脱前の処理
   */
  handleBeforeUnload() {
    this.saveData()
  }

  /**
   * ページ表示状態変更処理
   */
  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      this.loadData()
      this.render()
    }
  }

  /**
   * localStorage変更処理（他のタブでの変更を検知）
   */
  handleStorageChange(event) {
    if (event.key === TodoStorage.STORAGE_KEY) {
      this.loadData()
      this.render()
      console.log('他のタブでデータが更新されました')
    }
  }

  /**
   * TODOアイテム追加
   */
  addTodos() {
    const inputText = this.elements.todoInput.value.trim()

    if (!inputText) {
      this.elements.todoInput.focus()
      return
    }

    this.elements.addBtn.disabled = true

    try {
      const items = InputProcessor.parseInput(inputText)

      if (items.length === 0) {
        return
      }

      const addedItems = TodoStorage.addItems(items)

      if (addedItems.length > 0) {
        this.loadData()
        this.render()
        this.elements.todoInput.value = ''
        this.focusInput()

        const message =
          addedItems.length === 1
            ? `タスク「${addedItems[0].text}」を追加しました`
            : `${addedItems.length}件のタスクを追加しました`

        console.log(message)
      } else {
        console.log('タスクの追加に失敗しました')
      }
    } catch (error) {
      console.error('Failed to add todos:', error)
    } finally {
      this.elements.addBtn.disabled = false
    }
  }

  /**
   * TODOアイテム切り替え
   */
  toggleTodo(id) {
    const item = this.data.items.find(item => item.id === id)
    if (!item) return

    const updatedItem = TodoStorage.updateItem(id, {
      completed: !item.completed,
    })

    if (updatedItem) {
      this.loadData()
      this.render()

      const status = updatedItem.completed ? '完了' : '未完了'
      console.log(`タスク「${updatedItem.text}」を${status}にしました`)

      // 削除ボタンの表示/非表示を即座に更新
      const todoItem = document.querySelector(`[data-id="${id}"]`)
      if (todoItem) {
        const deleteButton = todoItem.querySelector('.delete-button')
        if (deleteButton) {
          deleteButton.style.opacity = updatedItem.completed ? '1' : '0'
        }
      }
    }
  }

  /**
   * 全削除処理
   */
  handleClearAll() {
    if (this.data.items.length === 0) {
      return
    }

    const confirmMessage = `すべてのタスク ${this.data.items.length} 件を削除しますか？\nこの操作は取り消せません。`

    if (confirm(confirmMessage)) {
      TodoStorage.clearAll()
      this.loadData()
      this.render()
      this.focusInput()

      console.log('すべてのタスクを削除しました')
    }
  }

  /**
   * ボタンの状態を更新
   */
  updateButtonStates() {
    const { items } = this.data
    const hasItems = items.length > 0

    if (hasItems) {
      this.elements.clearAllBtn.classList.remove('hidden')
    } else {
      this.elements.clearAllBtn.classList.add('hidden')
    }
  }

  /**
   * TODOアイテム削除
   */
  deleteTodo(id) {
    const item = this.data.items.find(item => item.id === id)
    if (!item) return

    if (TodoStorage.deleteItem(id)) {
      this.loadData()
      this.render()

      console.log(`タスク「${item.text}」を削除しました`)
    }
  }

  /**
   * UIをレンダリング
   */
  render() {
    this.renderTodoList()
    this.updateButtonStates()
  }

  /**
   * TODOリストをレンダリング
   */
  renderTodoList() {
    const { items } = this.data

    if (items.length === 0) {
      this.elements.todoList.innerHTML = ''
      this.elements.emptyState.classList.remove('hidden')
      return
    }

    this.elements.emptyState.classList.add('hidden')

    const listHTML = items.map(item => this.createTodoItemHTML(item)).join('')

    this.elements.todoList.innerHTML = listHTML
  }

  /**
   * TODOアイテムのHTMLを生成
   */
  createTodoItemHTML(item) {
    const escapedText = InputProcessor.escapeHtml(item.text)
    const completedClass = item.completed ? 'completed' : ''
    const checkedAttr = item.completed ? 'checked' : ''
    const checkedClass = item.completed ? 'checked' : ''

    return `
            <li class="todo-item ${completedClass}" data-id="${item.id}">
                <div class="todo-checkbox ${checkedClass}">
                </div>
                <span class="todo-text">${escapedText}</span>
                <button type="button" 
                        class="delete-button" 
                        title="削除"
                        style="opacity: ${item.completed ? '1' : '0'}">×</button>
            </li>
        `
  }

  /**
   * 入力欄にフォーカス
   */
  focusInput() {
    setTimeout(() => {
      this.elements.todoInput.focus()
    }, 100)
  }

  /**
   * エラー表示
   */
  showError(message) {
    console.error(`エラー: ${message}`)
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      dataItems: this.data?.items?.length || 0,
      storageInfo: TodoStorage.getDebugInfo(),
      elementsCached: Object.keys(this.elements).length,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * DOM読み込み完了後にアプリ初期化
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!TodoStorage.isStorageAvailable()) {
    alert(
      'このブラウザではローカルストレージが利用できません。データの保存ができない場合があります。'
    )
  }

  window.todoApp = new TodoApp()
})

/**
 * Service Worker登録（PWA対応）
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then(registration => {
        console.log('SW registered: ', registration)
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}

window.TodoApp = TodoApp
