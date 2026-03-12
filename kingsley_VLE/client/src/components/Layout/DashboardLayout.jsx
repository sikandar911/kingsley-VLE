import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="ml-[230px] flex-1 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
