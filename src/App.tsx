import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import History from './pages/History'
import Accounts from './pages/Accounts'
import More from './pages/More'
import Allowance from './pages/Allowance'
import Goals from './pages/Goals'
import Categories from './pages/Categories'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/more" element={<More />} />
        <Route path="/allowance" element={<Allowance />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/categories" element={<Categories />} />
      </Routes>
    </Layout>
  )
}
