import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMaterialTransferRecordsAPI } from '@/services/apis'
import type { MaterialTransferRecord } from '@/types/api'

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

const MaterialTransferRecordsPage = () => {
  const [records, setRecords] = useState<MaterialTransferRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    const loadRecords = async () => {
      setIsLoading(true)
      const response = await getMaterialTransferRecordsAPI()
      if (response.status === 0) {
        setRecords(response.data)
      }
      setIsLoading(false)
    }
    void loadRecords()
  }, [])

  const filteredRecords = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    if (!keyword) return records
    return records.filter((record) =>
      [record.materialName, record.transferBy, record.location].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    )
  }, [records, searchKeyword])

  const totalTransferred = useMemo(
    () => records.reduce((sum, record) => sum + record.quantity, 0),
    [records]
  )

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 pb-2">
      <section className="rounded-md bg-white p-6 shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link to="/material-inventory">
                <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 hover:text-gray-800">
                  <ArrowLeft className="h-4 w-4" />
                  返回材料清單
                </Button>
              </Link>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-gray-800">材料移管紀錄</h1>
            <p className="mt-2 text-base text-gray-600">
              查看所有材料的移管紀錄，可依材料名稱、移管人或存放位置搜尋。
            </p>
          </div>
          <div className="grid min-w-[220px] grid-cols-2 gap-3">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-500">紀錄筆數</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{records.length}</p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-500">總移管數量</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{totalTransferred}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md bg-white p-6 shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">紀錄列表</h2>
          <div className="relative w-full max-w-sm">
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              className="h-9 rounded-full bg-white pl-10 pr-10 text-base font-medium text-gray-800 placeholder:text-gray-400"
              placeholder="搜尋材料名稱、移管人或位置"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            {searchKeyword ? (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                onClick={() => setSearchKeyword('')}
                aria-label="清除搜尋"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-500">載入中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 text-base text-gray-800">
              <thead>
                <tr className="bg-gray-50 text-gray-900">
                  <th className="w-[18%] border border-gray-300 px-3 py-2 text-base font-semibold">
                    材料名稱
                  </th>
                  <th className="w-[10%] border border-gray-300 px-3 py-2 text-base font-semibold">
                    移管數量
                  </th>
                  <th className="w-[15%] border border-gray-300 px-3 py-2 text-base font-semibold">
                    移管人
                  </th>
                  <th className="w-[25%] border border-gray-300 px-3 py-2 text-base font-semibold">
                    存放位置
                  </th>
                  <th className="w-[17%] border border-gray-300 px-3 py-2 text-base font-semibold">
                    移管時間
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td className="border border-gray-300 px-3 py-8 text-center text-gray-500" colSpan={5}>
                      {records.length === 0 ? '尚無任何材料移管紀錄' : '查無符合條件的紀錄'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/70">
                      <td className="border border-gray-300 px-3 py-2.5 font-medium">
                        {record.materialName}
                      </td>
                      <td className="border border-gray-300 px-3 py-2.5 text-center">
                        {record.quantity}
                      </td>
                      <td className="border border-gray-300 px-3 py-2.5">
                        {record.transferBy}
                      </td>
                      <td className="border border-gray-300 px-3 py-2.5">
                        {record.location}
                      </td>
                      <td className="border border-gray-300 px-3 py-2.5">
                        {formatDateTime(record.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredRecords.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            {searchKeyword ? `找到 ${filteredRecords.length} 筆符合的紀錄` : `共 ${records.length} 筆紀錄`}
          </div>
        )}
      </section>
    </div>
  )
}

export default MaterialTransferRecordsPage
