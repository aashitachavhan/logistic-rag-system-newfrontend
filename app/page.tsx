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
  X, 
  CheckCircle,
  Loader2,
  Sparkles,
  ChevronDown,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import axios from 'axios'

// Types
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface UploadResponse {
  filename: string
  is_logistics_document: boolean
  message: string
}

interface ChatRequest {
  question: string
  document?: string
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
  }, [selectedDocument])

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return
    
    setIsUploading(true)
    setUploadSuccess(false)
    setUploadValidation(null)
    
    // Add document to list
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
      
      // Update document status with validation result
      setDocuments(prev => prev.map(doc => 
        doc.name === file.name ? { 
          ...doc, 
          status: 'ready',
          isLogisticsDocument: response.data.is_logistics_document
        } : doc
      ))
      
      // Set validation message to display
      setUploadValidation(response.data)
      setUploadSuccess(true)
      
      // Clear success message after 5 seconds
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
      const response = await axios.post(`${API_URL}/chat`, {
        question: userMessage.content,
        document: selectedDocument
      })
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.answer,
        timestamp: new Date()
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="glass-dark border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Logistics RAG</h1>
                <p className="text-xs text-slate-400">Document Intelligence</p>
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-400">API Connected</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Sidebar - Upload Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Area */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-dark rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Upload className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Upload Documents</h2>
              </div>
              
              <div
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
                  ${dragActive 
                    ? 'border-cyan-400 bg-cyan-500/10' 
                    : 'border-slate-600 hover:border-slate-500'}
                  ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                `}
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
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                    <p className="text-slate-300">Processing document...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-slate-700/50 rounded-full">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Drop PDF here</p>
                      <p className="text-sm text-slate-400">or click to browse</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Upload Success & Validation Message */}
              <AnimatePresence>
                {uploadSuccess && uploadValidation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                      uploadValidation.is_logistics_document
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-yellow-500/10 border border-yellow-500/20'
                    }`}
                  >
                    {uploadValidation.is_logistics_document ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 text-sm">
                          ✓ Logistics document detected
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        <span className="text-yellow-400 text-sm">
                          ⚠ This might not be a logistics document
                        </span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Documents List */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-dark rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Documents</h2>
              </div>
              
              {documents.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  No documents uploaded yet
                </p>
              ) : (
                <ul className="space-y-3">
                  {documents.map((doc, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 bg-slate-800/50 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-white truncate">{doc.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.status === 'processing' ? (
                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                          ) : doc.isLogisticsDocument ? (
                            <div className="flex items-center gap-1 text-green-400" title="Logistics document">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-yellow-400" title="Not a logistics document">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                          <button
                            onClick={() => removeDocument(doc.name)}
                            className="p-1 hover:bg-slate-700 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                      {/* Upload time and validation status */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 pl-8">
                        {doc.uploadTime && (
                          <span>{new Date(doc.uploadTime).toLocaleString()}</span>
                        )}
                        {doc.status === 'ready' && (
                          <span className={doc.isLogisticsDocument ? 'text-green-400' : 'text-yellow-400'}>
                            {doc.isLogisticsDocument ? '✓ Logistics document' : '⚠ Not a logistics document'}
                          </span>
                        )}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>
          
          {/* Right Section - Chat Interface */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-dark rounded-2xl h-[calc(100vh-180px)] flex flex-col"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
                    <p className="text-xs text-slate-400">Ask questions about your documents</p>
                  </div>
                </div>
              </div>
              
              {/* Messages Area */}
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
                      <div className={`chat-bubble rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                          : 'bg-slate-700/50 text-slate-100'
                      }`}>
                        <p className={`whitespace-pre-wrap ${message.role === 'assistant' ? 'leading-relaxed break-words' : ''}`}>{message.content}</p>
                        <span className={`text-xs mt-1 block ${message.role === 'user' ? 'text-white/60' : 'text-slate-500'}`}>
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
              
              {/* Input Area */}
              <div className="p-4 border-t border-slate-700/50">
                {/* Document Selector */}
                {documents.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Selected Document:
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDocument}
                        onChange={(e) => setSelectedDocument(e.target.value)}
                        className="appearance-none w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      >
                        {documents.map((doc) => (
                          <option key={doc.name} value={doc.name}>
                            {doc.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask a question about your documents..."
                      disabled={isLoading}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-xl transition-all duration-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
