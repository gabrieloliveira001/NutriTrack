'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Doughnut, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, defaults } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)
defaults.color = '#ffffff'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redireciona para login se o usuário não estiver autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Todos os hooks abaixo são sempre chamados, sem retornar cedo
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selectedFoods, setSelectedFoods] = useState<any[]>([])

  const [personalName, setPersonalName] = useState('')
  const [personalAge, setPersonalAge] = useState('')
  const [personalWeight, setPersonalWeight] = useState('')
  const [personalHeight, setPersonalHeight] = useState('')
  const [gender, setGender] = useState('male')

  const [waterInput, setWaterInput] = useState('')
  const [waterLog, setWaterLog] = useState<{ quantity: number; time: Date }[]>([])

  const [nomePersonalizado, setNomePersonalizado] = useState('')
  const [quantidadePersonalizado, setQuantidadePersonalizado] = useState('')
  const [caloriasPersonalizadas, setCaloriasPersonalizadas] = useState('')
  const [proteinasPersonalizadas, setProteinasPersonalizadas] = useState('')
  const [carboidratosPersonalizadas, setCarboidratosPersonalizadas] = useState('')
  const [gordurasPersonalizadas, setGordurasPersonalizadas] = useState('')

  const [animacaoId, setAnimacaoId] = useState<number | null>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // Carregar dados do localStorage
  useEffect(() => {
    const storedFoods = localStorage.getItem('selectedFoods')
    if (storedFoods) setSelectedFoods(JSON.parse(storedFoods))
    const storedWater = localStorage.getItem('waterLog')
    if (storedWater) setWaterLog(JSON.parse(storedWater))
    const storedDetails = localStorage.getItem('personalDetails')
    if (storedDetails) {
      const details = JSON.parse(storedDetails)
      setPersonalAge(details.personalAge || '')
      setPersonalWeight(details.personalWeight || '')
      setPersonalHeight(details.personalHeight || '')
      setGender(details.gender || 'male')
      // Se já houver dados salvos, mantemos o nome; porém, se o usuário estiver logado, usamos o nome da sessão
      if (!details.personalName && session?.user?.name) {
        setPersonalName(session.user.name)
      } else {
        setPersonalName(details.personalName || '')
      }
    }
  }, [session])

  useEffect(() => {
    localStorage.setItem('selectedFoods', JSON.stringify(selectedFoods))
  }, [selectedFoods])
  useEffect(() => {
    localStorage.setItem('waterLog', JSON.stringify(waterLog))
  }, [waterLog])
  useEffect(() => {
    const details = { personalName, personalAge, personalWeight, personalHeight, gender }
    localStorage.setItem('personalDetails', JSON.stringify(details))
  }, [personalName, personalAge, personalWeight, personalHeight, gender])

  const handleSearch = async () => {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${search}&search_simple=1&action=process&json=1`
    )
    const data = await res.json()
    setResults(data.products)
  }

  const addToDiet = (item: any, index: number) => {
    setSelectedFoods([...selectedFoods, item])
    setAnimacaoId(index)
    setTimeout(() => setAnimacaoId(null), 500)
  }

  const removeFromDiet = (index: number) => {
    const updated = [...selectedFoods]
    updated.splice(index, 1)
    setSelectedFoods(updated)
  }

  const removeWaterEntry = (index: number) => {
    const updated = [...waterLog]
    updated.splice(index, 1)
    setWaterLog(updated)
  }

  const total = selectedFoods.reduce(
    (acc, item) => {
      const energy = item.nutriments?.energy || 0
      acc.calorias += parseFloat((energy / 4.184).toFixed(0))
      acc.proteinas += Math.round(item.nutriments?.proteins || 0)
      acc.carboidratos += Math.round(item.nutriments?.carbohydrates || 0)
      acc.gorduras += Math.round(item.nutriments?.fat || 0)
      return acc
    },
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
  )

  const totalWater = waterLog.reduce((acc, item) => acc + item.quantity, 0)

  const adicionarPersonalizado = () => {
    if (!nomePersonalizado || !caloriasPersonalizadas || !quantidadePersonalizado) return
    const fator = parseFloat(quantidadePersonalizado) / 100
    const novoItem = {
      product_name: nomePersonalizado,
      nutriments: {
        energy: parseFloat(caloriasPersonalizadas) * 4.184 * fator,
        proteins: parseFloat(proteinasPersonalizadas || '0') * fator,
        carbohydrates: parseFloat(carboidratosPersonalizadas || '0') * fator,
        fat: parseFloat(gordurasPersonalizadas || '0') * fator,
      },
    }
    setSelectedFoods([...selectedFoods, novoItem])
    setNomePersonalizado('')
    setQuantidadePersonalizado('')
    setCaloriasPersonalizadas('')
    setProteinasPersonalizadas('')
    setCarboidratosPersonalizadas('')
    setGordurasPersonalizadas('')
  }

  const adicionarAgua = () => {
    if (!waterInput) return
    const quantidade = parseFloat(waterInput)
    if (isNaN(quantidade) || quantidade <= 0) return
    const novaEntrada = { quantity: quantidade, time: new Date() }
    setWaterLog([...waterLog, novaEntrada])
    setWaterInput('')
  }

  const imc =
    personalWeight && personalHeight
      ? (parseFloat(personalWeight) / Math.pow(parseFloat(personalHeight) / 100, 2)).toFixed(1)
      : null
  let imcMessage = ''
  if (imc) {
    const imcNum = parseFloat(imc)
    if (imcNum < 18.5) imcMessage = 'Abaixo do peso'
    else if (imcNum < 25) imcMessage = 'Peso normal'
    else if (imcNum < 30) imcMessage = 'Sobrepeso'
    else imcMessage = 'Obesidade'
  }

  const bmr =
    personalWeight && personalHeight && personalAge
      ? gender === 'male'
        ? (
            10 * parseFloat(personalWeight) +
            6.25 * parseFloat(personalHeight) -
            5 * parseFloat(personalAge) +
            5
          ).toFixed(0)
        : (
            10 * parseFloat(personalWeight) +
            6.25 * parseFloat(personalHeight) -
            5 * parseFloat(personalAge) -
            161
          ).toFixed(0)
      : null

  const recommendedWater = personalWeight ? parseFloat(personalWeight) * 50 : 0

  const waterData = {
    labels: ['Consumido', 'Restante'],
    datasets: [
      {
        data: [totalWater, Math.max(recommendedWater - totalWater, 0)],
        backgroundColor: ['#36A2EB', '#FF6384'],
      },
    ],
  }

  const macroData = {
    labels: ['Proteínas', 'Carboidratos', 'Gorduras'],
    datasets: [
      {
        data: [total.proteinas, total.carboidratos, total.gorduras],
        backgroundColor: ['#FFCE56', '#36A2EB', '#FF6384'],
      },
    ],
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    const dataAtual = new Date().toLocaleDateString()
    doc.setFontSize(16)
    doc.text('Resumo da Dieta', 20, 20)
    doc.setFontSize(10)
    doc.text(`Data: ${dataAtual}`, 150, 20)
    let y = 30
    doc.setFontSize(12)
    doc.text(`Nome: ${personalName || 'N/A'}`, 20, y)
    y += 8
    doc.text(`Idade: ${personalAge || 'N/A'}`, 20, y)
    y += 8
    doc.text(`Peso: ${personalWeight || 'N/A'} kg`, 20, y)
    y += 8
    doc.text(`Altura: ${personalHeight || 'N/A'} cm`, 20, y)
    y += 8
    doc.text(`Sexo: ${gender === 'male' ? 'Masculino' : 'Feminino'}`, 20, y)
    y += 8
    if (imc) {
      doc.text(`IMC: ${imc} (${imcMessage})`, 20, y)
      y += 8
    }
    if (bmr) {
      doc.text(`Calorias Diárias (BMR): ${bmr} kcal`, 20, y)
      y += 8
    }
    doc.text(`Água Recomendada: ${recommendedWater} ml`, 20, y)
    y += 8
    doc.text(`Água Consumida: ${totalWater} ml`, 20, y)
    y += 8
    doc.text('Histórico de Água:', 20, y)
    y += 8
    waterLog.forEach((entry) => {
      const hora = new Date(entry.time).toLocaleTimeString()
      doc.text(`• ${hora} - ${entry.quantity} ml`, 20, y)
      y += 6
    })
    y += 6
    doc.setFontSize(14)
    doc.text('Alimentos na Dieta:', 20, y)
    y += 8
    selectedFoods.forEach((food) => {
      const nome = food.product_name || 'Sem nome'
      const kcal = Math.round((food.nutriments?.energy || 0) / 4.184)
      doc.setFontSize(12)
      doc.text(`• ${nome} – ${kcal} kcal`, 20, y)
      y += 8
    })
    y += 10
    doc.setFontSize(14)
    doc.text('Totais:', 20, y)
    y += 8
    doc.setFontSize(12)
    doc.text(`Calorias: ${total.calorias} kcal`, 20, y)
    y += 6
    doc.text(`Proteínas: ${total.proteinas} g`, 20, y)
    y += 6
    doc.text(`Carboidratos: ${total.carboidratos} g`, 20, y)
    y += 6
    doc.text(`Gorduras: ${total.gorduras} g`, 20, y)
    doc.save('resumo_dieta.pdf')
  }

  const exportarCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'Alimento,Calorias,Proteínas,Carboidratos,Gorduras\n'
    selectedFoods.forEach(food => {
      const nome = food.product_name || 'Sem nome'
      const kcal = Math.round((food.nutriments?.energy || 0) / 4.184)
      const prot = Math.round(food.nutriments?.proteins || 0)
      const carb = Math.round(food.nutriments?.carbohydrates || 0)
      const gord = Math.round(food.nutriments?.fat || 0)
      csvContent += `"${nome}",${kcal},${prot},${carb},${gord}\n`
    })
    csvContent += '\nDados Pessoais\n'
    csvContent += `Nome:,${personalName || 'N/A'}\n`
    csvContent += `Idade:,${personalAge || 'N/A'}\n`
    csvContent += `Peso:,${personalWeight || 'N/A'} kg\n`
    csvContent += `Altura:,${personalHeight || 'N/A'} cm\n`
    csvContent += `Sexo:,${gender === 'male' ? 'Masculino' : 'Feminino'}\n`
    if (imc) csvContent += `IMC:,${imc} (${imcMessage})\n`
    if (bmr) csvContent += `Calorias Diárias (BMR):,${bmr} kcal\n`
    csvContent += `Água Recomendada:,${recommendedWater} ml\n`
    csvContent += '\nConsumo de Água\n'
    csvContent += `Total de Água Consumida:,${totalWater} ml\n`
    csvContent += 'Horário,Quantidade (ml)\n'
    waterLog.forEach(entry => {
      csvContent += `${new Date(entry.time).toLocaleTimeString()},${entry.quantity}\n`
    })
    csvContent += `\nData da Exportação:,${new Date().toLocaleDateString()}\n`
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'resumo_dieta.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-bold animate-bounce">NutriTrack</h1>
        {personalName && (
          <p className="mt-2 text-2xl text-green-400">
            Bem-vindo, {personalName}!
          </p>
        )}
      </header>
      <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 text-center">Detalhes Pessoais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="p-3 rounded-lg bg-gray-700 border border-gray-600 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            type="text"
            placeholder="Nome"
            value={personalName}
            onChange={(e) => setPersonalName(e.target.value)}
          />
          <input
            className="p-3 rounded-lg bg-gray-700 border border-gray-600 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            type="number"
            placeholder="Idade"
            value={personalAge}
            onChange={(e) => setPersonalAge(e.target.value)}
          />
          <input
            className="p-3 rounded-lg bg-gray-700 border border-gray-600 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            type="number"
            placeholder="Peso (kg)"
            value={personalWeight}
            onChange={(e) => setPersonalWeight(e.target.value)}
          />
          <input
            className="p-3 rounded-lg bg-gray-700 border border-gray-600 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            type="number"
            placeholder="Altura (cm)"
            value={personalHeight}
            onChange={(e) => setPersonalHeight(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <label className="text-white">Sexo:</label>
            <label className="flex items-center gap-1">
              <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} /> Masculino
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} /> Feminino
            </label>
          </div>
        </div>
        {imc && (
          <div className="mt-4 text-center text-lg">
            <p><strong>IMC:</strong> {imc} ({imcMessage})</p>
            <p><strong>Água Recomendada:</strong> {recommendedWater} ml</p>
            {bmr && <p><strong>Calorias Diárias (BMR):</strong> {bmr} kcal</p>}
          </div>
        )}
      </section>
      <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 text-center">Consumo de Água</h2>
        <div className="flex justify-center gap-4">
          <input
            className="p-3 rounded-lg bg-gray-700 border border-gray-600 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500 w-1/3"
            type="number"
            placeholder="Quantidade (ml)"
            value={waterInput}
            onChange={(e) => setWaterInput(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition"
            onClick={adicionarAgua}
          >
            Adicionar Água
          </button>
        </div>
        {waterLog.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold">Histórico de Água:</h3>
            <ul className="mt-2">
              {waterLog.map((entry, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <span>{new Date(entry.time).toLocaleTimeString()} - {entry.quantity} ml</span>
                  <button onClick={() => removeWaterEntry(idx)} className="text-red-400 hover:text-red-600">❌</button>
                </li>
              ))}
            </ul>
            <p className="mt-2 font-bold">Total: {totalWater} ml</p>
          </div>
        )}
      </section>
      <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 text-center">Buscar Alimento</h2>
        <div className="flex justify-center gap-2 mb-6">
          <input
            className="p-3 rounded-lg w-1/2 bg-gray-700 border border-gray-600 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            type="text"
            placeholder="Digite o nome do alimento"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition"
            onClick={handleSearch}
          >
            Buscar
          </button>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((item, i) => (
            <li key={i} className="bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-700 text-white transform hover:scale-105 transition">
              <div className="flex items-center gap-4 mb-3">
                <img
                  src={item.image_front_small_url || 'https://thumb.ac-illust.com/b1/b170870007dfa419295d949814474ab2_t.jpeg'}
                  alt={item.product_name || 'Sem nome'}
                  className="w-16 h-16 object-cover rounded"
                />
                <h2 className="font-semibold text-lg truncate max-w-[120px]" title={item.product_name || 'Sem nome'}>
                  {item.product_name || 'Sem nome'}
                </h2>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Calorias:</strong> {(item.nutriments.energy / 4.184).toFixed(0) || 'N/A'} kcal</p>
                <p><strong>Proteínas:</strong> {Math.round(item.nutriments?.proteins || 0)} g</p>
                <p><strong>Carboidratos:</strong> {Math.round(item.nutriments?.carbohydrates || 0)} g</p>
                <p><strong>Gorduras:</strong> {Math.round(item.nutriments?.fat || 0)} g</p>
                {item.serving_size && <p><strong>Porção:</strong> {item.serving_size}</p>}
                <button className={`mt-3 w-full bg-green-600 text-white py-2 rounded-lg transition transform ${animacaoId === i ? 'scale-105 animate-pulse' : ''}`} onClick={() => addToDiet(item, i)}>
                  Incluir na dieta
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 text-center">Adicionar Alimento Manualmente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
          <input className="p-3 rounded-lg bg-white" type="text" placeholder="Nome do alimento" value={nomePersonalizado} onChange={(e) => setNomePersonalizado(e.target.value)} />
          <input className="p-3 rounded-lg bg-white" type="number" placeholder="Quantidade (g ou ml)" value={quantidadePersonalizado} onChange={(e) => setQuantidadePersonalizado(e.target.value)} />
          <input className="p-3 rounded-lg bg-white" type="number" placeholder="Calorias por 100g (kcal)" value={caloriasPersonalizadas} onChange={(e) => setCaloriasPersonalizadas(e.target.value)} />
          <input className="p-3 rounded-lg bg-white" type="number" placeholder="Proteínas por 100g (g)" value={proteinasPersonalizadas} onChange={(e) => setProteinasPersonalizadas(e.target.value)} />
          <input className="p-3 rounded-lg bg-white" type="number" placeholder="Carboidratos por 100g (g)" value={carboidratosPersonalizadas} onChange={(e) => setCarboidratosPersonalizadas(e.target.value)} />
          <input className="p-3 rounded-lg bg-white" type="number" placeholder="Gorduras por 100g (g)" value={gordurasPersonalizadas} onChange={(e) => setGordurasPersonalizadas(e.target.value)} />
        </div>
        <button onClick={adicionarPersonalizado} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition">
          Adicionar alimento personalizado
        </button>
      </section>
      {selectedFoods.length > 0 && (
        <section className="bg-gray-800 p-6 mt-12 rounded-xl shadow-lg border border-gray-700 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">Resumo da Dieta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {selectedFoods.map((food, idx) => (
              <div key={idx} className="relative bg-gray-700 p-4 rounded-2xl shadow-md">
                <button onClick={() => removeFromDiet(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                  ❌
                </button>
                <div className="flex items-center gap-4">
                  <img src={food.image_front_small_url || 'https://thumb.ac-illust.com/b1/b170870007dfa419295d949814474ab2_t.jpeg'} alt={food.product_name || 'Sem nome'} className="w-16 h-16 object-cover rounded" />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg truncate" title={food.product_name || 'Sem nome'}>
                      {food.product_name || 'Sem nome'}
                    </h3>
                    <p className="text-sm">{Math.round(food.nutriments?.energy / 4.184 || 0)} kcal</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-lg space-y-1 mb-4">
            <p><strong>Total de Calorias:</strong> {total.calorias} kcal</p>
            <p><strong>Total de Proteínas:</strong> {total.proteinas} g</p>
            <p><strong>Total de Carboidratos:</strong> {total.carboidratos} g</p>
            <p><strong>Total de Gorduras:</strong> {total.gorduras} g</p>
            <p><strong>Total de Água:</strong> {totalWater} ml</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-center">Consumo de Água</h3>
              <Pie data={waterData} />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-center">Macronutrientes</h3>
              <Doughnut data={macroData} />
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={exportarPDF} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition">
              Exportar como PDF
            </button>
            <button onClick={exportarCSV} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg transition">
              Exportar como CSV
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
