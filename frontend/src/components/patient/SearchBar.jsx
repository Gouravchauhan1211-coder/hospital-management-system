import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SearchBar = () => {
    const navigate = useNavigate()

    return (
        <div
            onClick={() => navigate('/patient/doctors')}
            className="bg-white rounded-xl shadow-sm px-4 py-3.5 mb-6 flex items-center gap-3 cursor-pointer border border-gray-50 hover:border-blue-100 transition-all group"
        >
            <Search className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-gray-400 text-sm">Search doctor, specialty...</span>
        </div>
    )
}

export default SearchBar
