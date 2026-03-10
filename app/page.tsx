'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  MessageSquare, 
  FileText, 
  Send, 
  Bot, 
  User, 
  ChevronUp,
  ChevronDown,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import axios from 'axios'

// Types
interface Source {
  document: string
  page: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Source[]
}

interface UploadResponse {
  filename: string
  is_logistics_document: boolean
  message: string
}

interface DocumentMetadata {
  filename: string
  upload_time: string
  is_logistics_document: boolean
}

interface Document {
  name: string
  status: 'uploaded' | 'processing' | 'ready'
  isLogisticsDocument?: boolean
  uploadTime?: string
}

interface ChatSession {
  id: string
  session_title: string
  created_at: string
  messages: Message[]
}

// API Base URL
const API_URL = 'http://localhost:8000'

export default function Home() {
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your logistics document assistant. Upload your documents and I\'ll help you find answers from them.',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadValidation, setUploadValidation] = useState<UploadResponse | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<string>("")
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  // Collapsible sections state
  const [sectionsOpen, setSectionsOpen] = useState({
    newChat: true,
    upload: true,
    documents: true,
    history: true
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch documents from MongoDB on mount
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await axios.get(`${API_URL}/documents`)
        if (response.data && response.data.documents) {
          const fetchedDocs: Document[] = response.data.documents.map((doc: DocumentMetadata) => ({
            name: doc.filename,
            status: 'ready',
            isLogisticsDocument: doc.is_logistics_document,
            uploadTime: doc.upload_time
          }))
          setDocuments(fetchedDocs)
          if (fetchedDocs.length > 0 && !selectedDocument) {
            setSelectedDocument(fetchedDocs[0].name)
          }
        }
      } catch (error) {
        console.error('Error fetching documents:', error)
      }
    }
    fetchDocuments()
  }, [])

  // Fetch chat sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await axios.get(`${API_URL}/chat/sessions`)
        setSessions(response.data)
      } catch (error) {
        console.error('Error fetching sessions:', error)
      }
    }
    fetchSessions()
  }, [])

  // Create new session
  const createNewSession = async () => {
    try {
      const title = selectedDocument || "General Chat"
      const response = await axios.post(`${API_URL}/chat/create-session`, { session_title: title })
      const sessionId = response.data.session_id
      setCurrentSessionId(sessionId)
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your logistics document assistant. Upload your documents and I\'ll help you find answers from them.',
        timestamp: new Date()
      }])
      const sessionsResponse = await axios.get(`${API_URL}/chat/sessions`)
      setSessions(sessionsResponse.data)
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  // Load session
  const loadSession = async (sessionId: string) => {
    try {
      const response = await axios.get(`${API_URL}/chat/session/${sessionId}`)
      const session = response.data
      setCurrentSessionId(sessionId)
      const loadedMessages: Message[] = session.messages.map((msg: any, index: number) => ({
        id: (index + 1).toString(),
        role: msg.role,
        content: msg.content,
        timestamp: new Date(),
        sources: msg.sources
      }))
      setMessages(loadedMessages)
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  // Delete session
  const deleteSession = async (sessionId: string) => {
    try {
      await axios.delete(`${API_URL}/chat/session/${sessionId}`)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
        setMessages([{
          id: '1',
          role: 'assistant',
          content: 'Hello! I\'m your logistics document assistant. Upload your documents and I\'ll help you find answers from them.',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return
    
    setIsUploading(true)
    setUploadSuccess(false)
    setUploadValidation(null)
    
    const newDoc: Document = {
      name: file.name,
      status: 'processing'
    }
    setDocuments(prev => [...prev, newDoc])
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await axios.post<UploadResponse>(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setDocuments(prev => prev.map(doc => 
        doc.name === file.name ? { 
          ...doc, 
          status: 'ready',
          isLogisticsDocument: response.data.is_logistics_document
        } : doc
      ))
      
      setUploadValidation(response.data)
      setUploadSuccess(true)
      
      setTimeout(() => {
        setUploadSuccess(false)
        setUploadValidation(null)
      }, 5000)
      
    } catch (error) {
      console.error('Upload error:', error)
      setDocuments(prev => prev.filter(doc => doc.name !== file.name))
    } finally {
      setIsUploading(false)
    }
  }

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  // Handle chat submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      let response
      if (currentSessionId) {
        response = await axios.post(`${API_URL}/chat/${currentSessionId}`, {
          question: userMessage.content,
          document: selectedDocument
        })
      } else {
        response = await axios.post(`${API_URL}/chat`, {
          question: userMessage.content,
          document: selectedDocument
        })
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.answer,
        timestamp: new Date(),
        sources: response.data.sources
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure your backend is running and you have uploaded documents.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Remove document
  const removeDocument = async (name: string) => {
    try {
      await axios.delete(`${API_URL}/documents/${name}`)
      setDocuments(prev => prev.filter(doc => doc.name !== name))
      if (selectedDocument === name) {
        const remaining = documents.filter(doc => doc.name !== name)
        setSelectedDocument(remaining.length > 0 ? remaining[0].name : "")
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  // Toggle section
  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      
      {/* Left Sidebar */}
      <div className="w-96 bg-slate-900/95 border-r border-slate-700/50 flex flex-col h-full">
        
        {/* Logo/Title */}
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Logistics Assistant</h2>
              <p className="text-xs text-slate-400">Ask about your documents</p>
            </div>
          </div>
        </div>
        
        {/* Scrollable Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={createNewSession}
              className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              New Chat
            </button>
          </div>

          {/* Upload Doc Section */}
          <div className="px-3 pb-2">
            <button
              onClick={() => toggleSection('upload')}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2 text-white">
                <Upload className="w-5 h-5 text-cyan-400" />
                <span className="font-medium">Upload Doc</span>
              </div>
              {sectionsOpen.upload ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            
            <AnimatePresence>
              {sectionsOpen.upload && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className={`mt-2 border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 ${
                      dragActive 
                        ? 'border-cyan-400 bg-cyan-500/10' 
                        : 'border-slate-600 hover:border-slate-500'
                    } ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />
                    
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                        <p className="text-slate-300 text-sm">Processing...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-slate-400" />
                        <p className="text-white text-sm font-medium">Drop PDF here</p>
                        <p className="text-slate-400 text-xs">or click to browse</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Success Message */}
                  {uploadSuccess && uploadValidation && (
                    <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 ${
                      uploadValidation.is_logistics_document
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-yellow-500/10 border border-yellow-500/20'
                    }`}>
                      {uploadValidation.is_logistics_document ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-xs">Logistics document</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 text-xs">Not logistics doc</span>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Documents Section */}
          <div className="px-3 pb-2">
            <button
              onClick={() => toggleSection('documents')}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2 text-white">
                <FileText className="w-5 h-5 text-purple-400" />
                <span className="font-medium">Documents</span>
              </div>
              {sectionsOpen.documents ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            
            <AnimatePresence>
              {sectionsOpen.documents && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-2">
                    {documents.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-2">No documents</p>
                    ) : (
                      documents.map((doc, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedDocument(doc.name)}
                          className={`p-2 rounded-lg cursor-pointer flex items-center justify-between ${
                            selectedDocument === doc.name 
                              ? 'bg-cyan-500/20 border border-cyan-500/30' 
                              : 'bg-slate-800/50 hover:bg-slate-700/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className={`text-sm truncate ${selectedDocument === doc.name ? 'text-cyan-400' : 'text-white'}`}>
                              {doc.name}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeDocument(doc.name); }}
                            className="p-1 hover:bg-slate-600 rounded flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History Section */}
          <div className="px-3 pb-3">
            <button
              onClick={() => toggleSection('history')}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2 text-white">
                <MessageSquare className="w-5 h-5 text-green-400" />
                <span className="font-medium">History</span>
              </div>
              {sectionsOpen.history ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            
            <AnimatePresence>
              {sectionsOpen.history && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-2">
                    {sessions.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-2">No sessions</p>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.id}
                          className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg flex items-center justify-between cursor-pointer"
                          onClick={() => loadSession(session.id)}
                        >
                          <span className="text-sm text-white truncate">{session.session_title}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                            className="p-1 hover:bg-slate-600 rounded flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
      </div>
      
      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center gap-3 h-11">
            {/* <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Logistics Assistant</h2>
              <p className="text-xs text-slate-400">Ask about your documents</p>
            </div> */}
          </div>
        </div>
        
        {/* Messages Area - Takes remaining space */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600' 
                    : 'bg-gradient-to-br from-violet-500 to-purple-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-100'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed break-words">{message.content}</p>
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <p className="text-xs text-slate-400 mb-2">Sources:</p>
                      <ul className="space-y-1">
                        {message.sources.map((source, idx) => (
                          <li key={idx} className="text-xs text-slate-300">
                            Page {source.page} — {source.document}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <span className={`text-xs mt-2 block ${message.role === 'user' ? 'text-white/60' : 'text-slate-500'}`}>
                    {message.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Typing Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-700/50 rounded-2xl p-4">
                  <div className="typing-indicator flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area - Always visible at bottom */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
          {/* Document Selector */}
          {documents.length > 0 && (
            <div className="mb-3">
              <select
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                {documents.map((doc) => (
                  <option key={doc.name} value={doc.name}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something about your logistics documents..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-xl transition-all duration-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

