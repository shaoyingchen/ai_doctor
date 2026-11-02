import { useState, useCallback } from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSearchStore, type SearchMode } from '@/stores/searchStore'
import { cn } from '@/lib/cn'

const searchModes: { value: SearchMode; label: string; description: string }[] = [
  { value: 'hybrid', label: '混合检索', description: '结合语义和关键词匹配' },
  { value: 'semantic', label: '语义检索', description: '理解查询意图进行匹配' },
  { value: 'keyword', label: '关键词检索', description: '精确匹配关键词' }
]

export function SearchBar() {
  const { query, setQuery, searchMode, setSearchMode, search, isSearching } = useSearchStore()
  const [isFocused, setIsFocused] = useState(false)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        search()
      }
    },
    [search]
  )

  const handleClear = useCallback(() => {
    setQuery('')
  }, [setQuery])

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Mode Tabs */}
      <div className="flex justify-center mb-4">
        <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
          <TabsList className="bg-white border border-slate-200">
            {searchModes.map((mode) => (
              <TabsTrigger
                key={mode.value}
                value={mode.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                {mode.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Search Input */}
      <div
        className={cn(
          'relative flex items-center bg-white rounded-xl border-2 transition-all duration-200',
          isFocused ? 'border-primary shadow-lg' : 'border-slate-200 shadow-sm'
        )}
      >
        <div className="absolute left-4 text-slate-400">
          <SearchIcon className="w-5 h-5" />
        </div>

        <Input
          type="text"
          placeholder="输入关键词或问题进行智能检索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 h-14 pl-12 pr-20 text-lg border-0 focus:ring-0 focus:outline-none bg-transparent"
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute right-28 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <Button
          onClick={search}
          disabled={isSearching || !query.trim()}
          className="absolute right-2 h-10 px-6 bg-primary hover:bg-primary-600 text-white rounded-lg"
        >
          {isSearching ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              搜索中
            </span>
          ) : (
            '搜索'
          )}
        </Button>
      </div>

      {/* Search Mode Description */}
      <p className="text-center text-sm text-slate-500 mt-3">
        {searchModes.find((m) => m.value === searchMode)?.description}
      </p>
    </div>
  )
}