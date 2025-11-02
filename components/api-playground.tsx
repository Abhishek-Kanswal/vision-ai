"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Plus, Trash2, Home, Check, Key } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import Link from "next/link";

interface ApiPlaygroundProps {
    user: User | null
}

interface ApiKey {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    is_active: boolean;
}

export default function ApiPlayground({ user }: ApiPlaygroundProps) {
    const [isClient, setIsClient] = useState(false)
    const [query, setQuery] = useState("")
    const [deepSearch, setDeepSearch] = useState(false)
    const [activeCodeTab, setActiveCodeTab] = useState<"javascript" | "python" | "curl">("javascript")
    const [activeTab, setActiveTab] = useState<"playground" | "api-keys">("playground")
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
    const [newKeyName, setNewKeyName] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [apiResponse, setApiResponse] = useState<any>(null)
    const [isCreatingKey, setIsCreatingKey] = useState(false)
    const [copiedItem, setCopiedItem] = useState<string | null>(null)

    const router = useRouter()
    const API_KEY = process.env.NEXT_PUBLIC_VISIONAI_API_KEY
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://vision.immylab.tech'

    useEffect(() => {
        setIsClient(true)
        setQuery("What is the ETH price?")
    }, [])

    useEffect(() => {
        loadApiKeys()
    }, [user])

    const loadApiKeys = async () => {
        if (!user) {
            setApiKeys([])
            return
        }

        try {
            const supabase = supabaseBrowser()
            const { data, error } = await supabase
                .from('api_keys')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error loading API keys:', error)
                return
            }

            const formattedKeys: ApiKey[] = data?.map(key => ({
                id: key.id,
                name: key.key_name,
                key: key.key,
                createdAt: key.created_at,
                is_active: key.is_active
            })) || []

            setApiKeys(formattedKeys)
        } catch (error) {
            console.error('Error loading API keys:', error)
        }
    }

    const generateApiKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let result = 'sk_'
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    const createApiKey = async () => {
        if (!newKeyName.trim() || !user) return

        setIsCreatingKey(true)
        try {
            const supabase = supabaseBrowser()
            const newKeyValue = generateApiKey()

            const { data, error } = await supabase
                .from('api_keys')
                .insert({
                    key: newKeyValue,
                    key_name: newKeyName.trim(),
                    user_id: user.id,
                    is_active: true
                })
                .select()
                .single()

            if (error) {
                console.error('Error creating API key:', error)
                alert('Failed to create API key: ' + error.message)
                return
            }

            const newKey: ApiKey = {
                id: data.id,
                name: data.key_name,
                key: data.key,
                createdAt: data.created_at,
                is_active: data.is_active
            }

            setApiKeys(prev => [newKey, ...prev])
            setNewKeyName("")

        } catch (error) {
            console.error('Error creating API key:', error)
            alert('Failed to create API key')
        } finally {
            setIsCreatingKey(false)
        }
    }

    const deleteApiKey = async (id: string) => {
        if (apiKeys.length === 1) {
            alert('You must have at least one API key')
            return
        }

        if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
            return
        }

        try {
            const supabase = supabaseBrowser()
            const { error } = await supabase
                .from('api_keys')
                .update({ is_active: false })
                .eq('id', id)

            if (error) {
                console.error('Error deleting API key:', error)
                alert('Failed to delete API key: ' + error.message)
                return
            }

            setApiKeys(prev => prev.filter(k => k.id !== id))

        } catch (error) {
            console.error('Error deleting API key:', error)
            alert('Failed to delete API key')
        }
    }

    const copyToClipboard = async (text: string, itemId: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedItem(itemId)
            setTimeout(() => setCopiedItem(null), 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }

    const generateJavaScriptCode = () => {
        return `const response = await fetch('${API_URL}/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: '${query}' }
    ],
    data: { deepSearch: ${deepSearch} }
  })
});

const data = await response.json();
console.log('Status:', response.status);
console.log('Response:', data);`
    }

    const generatePythonCode = () => {
        return `import requests

url = "${API_URL}/api/chat"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
}
data = {
    "messages": [
        {"role": "user", "content": "${query}"}
    ],
    "data": {"deepSearch": ${deepSearch}}
}

response = requests.post(url, headers=headers, json=data)
print("Status:", response.status_code)
print("Response:", response.text)`
    }

    const generateCurlCode = () => {
        return `curl -X POST ${API_URL}/api/chat \\
  -H "Content-Type: "application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "messages": [
      { "role": "user", "content": "${query}" }
    ],
    "data": { "deepSearch": ${deepSearch} }
  }'`
    }

    const handleSendRequest = async () => {
        if (!query.trim()) return

        setIsLoading(true)
        setApiResponse(null)

        try {
            if (!API_KEY) {
                throw new Error('API key not configured. Please check your environment variables.')
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: query }],
                    data: { deepSearch }
                })
            })

            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text()
                throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}...`)
            }

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`)
            }

            setApiResponse(data)

        } catch (error) {
            console.error('API Error:', error)
            setApiResponse({
                error: "Failed to fetch response",
                details: error instanceof Error ? error.message : "Unknown error"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleHomeClick = () => {
        router.push("/")
    }

    const codeTabs = [
        {
            id: "javascript" as const,
            label: "JavaScript",
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.337-.404-.482-.586-.621-.378-.27-.93-.42-1.42-.42-.703 0-1.256.235-1.68.73-.595.645-.78 1.62-.54 2.52.214.9.84 1.455 1.754 1.845.63.27 1.01.45 1.215.72.18.24.21.51.15.78-.15.495-.66.75-1.275.75-.81 0-1.35-.345-1.65-1.035l-1.83.75c.21.78.81 1.5 2.25 1.5 1.05 0 1.95-.45 2.37-1.17.285-.45.435-1.095.36-1.68zm-8.904-3.33c-.165-.825-.495-1.5-1.005-1.98-.48-.45-1.08-.75-1.77-.87-.45-.09-.96-.075-1.35 0-1.2.255-1.95 1.095-2.04 2.115.075.615.405 1.125.885 1.455.465.33 1.05.525 1.65.585.48.045.93.075 1.305.18.375.105.75.27 1.05.525.3.255.495.615.57 1.065.09.495.045.945-.18 1.35-.225.405-.585.705-1.065.885-.465.18-1.02.225-1.59.135-.855-.165-1.5-.705-1.785-1.515l1.755-.75c.15.48.495.765.945.825.225.03.465.015.675-.075.195-.09.345-.255.42-.465.075-.21.075-.435 0-.645-.075-.21-.24-.39-.495-.495-.24-.105-.555-.165-.945-.18-.63-.03-1.17-.165-1.62-.405-.45-.24-.795-.585-1.02-1.035-.225-.45-.285-.975-.18-1.515.105-.54.39-1.02.825-1.38.45-.375 1.035-.585 1.68-.63.63-.045 1.185.06 1.65.315.465.255.81.645 1.02 1.155l-1.83.75z" />
                </svg>
            )
        },
        {
            id: "python" as const,
            label: "Python",
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
            )
        },
        {
            id: "curl" as const,
            label: "cURL",
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                    <path d="M12 6c-3.309 0-6 2.691-6 6s2.691 6 6 6 6-2.691 6-6-2.691-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z" />
                </svg>
            )
        },
    ]

    const getActiveCode = () => {
        switch (activeCodeTab) {
            case "javascript":
                return generateJavaScriptCode()
            case "python":
                return generatePythonCode()
            case "curl":
                return generateCurlCode()
            default:
                return ""
        }
    }

    const getLanguageForHighlighter = () => {
        switch (activeCodeTab) {
            case "javascript":
                return "javascript"
            case "python":
                return "python"
            case "curl":
                return "bash"
            default:
                return "javascript"
        }
    }

    if (!isClient) {
        return (
            <div className="h-screen flex flex-col bg-background">
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="border-b border-border">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center justify-center h-10 w-10 text-foreground hover:bg-accent mx-2 rounded-lg transition-colors">
                        <Home size={20} />
                    </Link>

                    {/* Tabs */}
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab("playground")}
                            className={`px-6 py-4 font-medium transition-colors ${activeTab === "playground"
                                ? "border-b-2 border-blue-500 text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Playground
                        </button>
                        <button
                            onClick={() => setActiveTab("api-keys")}
                            className={`px-6 py-4 font-medium transition-colors ${activeTab === "api-keys"
                                ? "border-b-2 border-blue-500 text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            API Keys
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {activeTab === "api-keys" && (
                    <div className="flex-1 overflow-auto p-4 lg:p-8">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">Manage API Keys</h2>
                                <p className="text-muted-foreground">Create and manage your API keys for authentication</p>
                            </div>

                            {!user ? (
                                <div className="p-6 border border-border rounded-lg bg-card text-center">
                                    <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground mb-4">
                                        Please sign in to manage your API keys
                                    </p>
                                    <Link
                                        href={{
                                            pathname: "/auth/login",
                                            query: { redirectTo: "/docs/api" },
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                                    >
                                        Sign in to Continue
                                    </Link>
                                    {/*  */}
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <label className="block text-sm font-semibold text-foreground">Create New API Key</label>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="text"
                                                value={newKeyName}
                                                onChange={(e) => setNewKeyName(e.target.value)}
                                                placeholder="Enter key name (e.g., Production, Development)"
                                                className="flex-1 px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                onKeyPress={(e) => e.key === "Enter" && createApiKey()}
                                            />
                                            <button
                                                onClick={createApiKey}
                                                disabled={isCreatingKey || !newKeyName.trim()}
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed sm:w-auto w-full"
                                            >
                                                {isCreatingKey ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                ) : (
                                                    <Plus size={18} />
                                                )}
                                                {isCreatingKey ? "Creating..." : "Create"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-sm font-semibold text-foreground">Your API Keys</label>
                                        <div className="space-y-2">
                                            {apiKeys.length === 0 ? (
                                                <div className="p-6 border border-border rounded-lg text-center">
                                                    <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                                    <p className="text-muted-foreground">No API keys found. Create your first one above.</p>
                                                </div>
                                            ) : (
                                                apiKeys.map((key) => (
                                                    <div
                                                        key={key.id}
                                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-blue-500/50 transition-colors gap-3"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-foreground">{key.name}</p>
                                                            <p className="text-sm text-muted-foreground font-mono truncate">{key.key}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Created {new Date(key.createdAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                                            <button
                                                                onClick={() => copyToClipboard(key.key, `key-${key.id}`)}
                                                                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                                                                title="Copy API Key"
                                                            >
                                                                {copiedItem === `key-${key.id}` ? (
                                                                    <Check size={16} className="text-green-500" />
                                                                ) : (
                                                                    <Copy size={16} />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => deleteApiKey(key.id)}
                                                                disabled={apiKeys.length === 1}
                                                                className="p-2 text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                title={apiKeys.length === 1 ? "You must have at least one API key" : "Delete API key"}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "playground" && (
                    <>
                        {/* Input Panel */}
                        <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto">
                            <div className="p-4 lg:p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-foreground">Query</label>
                                    <textarea
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Enter your search query..."
                                        className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none h-32"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-foreground">Deep Search</label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setDeepSearch(true)}
                                            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${deepSearch
                                                ? "bg-blue-500 text-white"
                                                : "bg-card border border-border text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            True
                                        </button>
                                        <button
                                            onClick={() => setDeepSearch(false)}
                                            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${!deepSearch
                                                ? "bg-blue-500 text-white"
                                                : "bg-card border border-border text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            False
                                        </button>
                                    </div>
                                </div>

                                {/* Send Request Button */}
                                <div className="lg:hidden">
                                    <Button
                                        onClick={handleSendRequest}
                                        disabled={isLoading || !query.trim() || !API_KEY}
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Sending...
                                            </div>
                                        ) : (
                                            "Send Request"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Code Panel */}
                        <div className="w-full lg:w-1/2 flex flex-col bg-card overflow-hidden">
                            <div className="border-b border-border px-4 lg:px-6 py-4 space-y-4">
                                <h2 className="text-lg font-semibold text-foreground">Code Examples</h2>
                                <div className="flex gap-1 overflow-x-auto">
                                    {codeTabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveCodeTab(tab.id)}
                                            className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center ${activeCodeTab === tab.id
                                                ? "bg-background border border-border text-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            <span className="mr-2">{tab.icon}</span>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto">
                                <div className="p-4 lg:p-6 space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Code</span>
                                            <button
                                                onClick={() => copyToClipboard(getActiveCode(), "code")}
                                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {copiedItem === "code" ? (
                                                    <Check size={14} className="text-green-500" />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                                {copiedItem === "code" ? "Copied!" : "Copy"}
                                            </button>
                                        </div>
                                        <div className="border border-border rounded-lg overflow-hidden bg-background">
                                            <SyntaxHighlighter
                                                language={getLanguageForHighlighter()}
                                                style={oneDark}
                                                customStyle={{
                                                    margin: 0,
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.75rem',
                                                    lineHeight: '1.4',
                                                    maxHeight: '300px'
                                                }}
                                                showLineNumbers
                                            >
                                                {getActiveCode()}
                                            </SyntaxHighlighter>
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-6 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Response</span>
                                            {apiResponse && (
                                                <button
                                                    onClick={() => copyToClipboard(JSON.stringify(apiResponse, null, 2), "response")}
                                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {copiedItem === "response" ? (
                                                        <Check size={14} className="text-green-500" />
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                    {copiedItem === "response" ? "Copied!" : "Copy"}
                                                </button>
                                            )}
                                        </div>
                                        <div className="border border-border rounded-lg overflow-hidden bg-background">
                                            <SyntaxHighlighter
                                                language="json"
                                                style={oneDark}
                                                customStyle={{
                                                    margin: 0,
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.75rem',
                                                    lineHeight: '1.4',
                                                    maxHeight: '300px'
                                                }}
                                                showLineNumbers
                                            >
                                                {apiResponse ? JSON.stringify(apiResponse, null, 2) : isLoading ? "// Waiting for response..." : "// Send a request to see the response here..."}
                                            </SyntaxHighlighter>
                                        </div>
                                    </div>

                                    {/* Send Request Button - Hidden on mobile, shown on desktop in code panel */}
                                    <div className="hidden lg:block">
                                        <Button
                                            onClick={handleSendRequest}
                                            disabled={isLoading || !query.trim() || !API_KEY}
                                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Sending...
                                                </div>
                                            ) : (
                                                "Send Request"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}