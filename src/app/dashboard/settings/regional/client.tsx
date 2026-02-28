"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, FileDown, Map, MapPin, Building2, Home, MoreHorizontal, Plus, Trash, Search, Loader2 } from "lucide-react"

import { Tree } from "@/components/ui/tree"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getRegionalTreeLevel, searchRegionalTree } from "@/lib/actions/regional-tree"

// CRUD Actions & Schemas
import { deleteProvince } from "@/lib/actions/province"
import { deleteDistrict } from "@/lib/actions/district"
import { deleteSubDistrict } from "@/lib/actions/sub-district"
import { deleteVillage } from "@/lib/actions/village"

// Modals
import { ProvinceFormModal } from "@/components/province-form-modal"
import { DistrictFormModal } from "@/components/district-form-modal"
import { SubDistrictFormModal } from "@/components/sub-district-form-modal"
import { VillageFormModal } from "@/components/village-form-modal"

type RegionalNode = {
  id: string
  name: string
  code: string
  type: "province" | "district" | "subdistrict" | "village"
  parentId?: string 
}

interface RegionalTreeClientProps {
  initialProvinces: RegionalNode[]
}

const TYPE_COLORS = {
  province: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
  district: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400",
  subdistrict: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400",
  village: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400",
}

export function RegionalTreeClient({ initialProvinces }: RegionalTreeClientProps) {
  // Modal Visibility States
  const [activeModal, setActiveModal] = React.useState<"province" | "district" | "subdistrict" | "village" | null>(null)
  
  // Data passed into the Modal (either for Editing the node, or providing the parentId when Adding a child)
  const [modalData, setModalData] = React.useState<any>(null)
  const [parentData, setParentData] = React.useState<any>(null)

  // Search State
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(async () => {
       if (searchQuery.length >= 2) {
          setIsSearching(true)
          const res = await searchRegionalTree(searchQuery)
          if (res.success) setSearchResults(res.data || [])
          setIsSearching(false)
       } else {
          setSearchResults([])
       }
    }, 400) // debounce 400ms

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleAddChild = (node: RegionalNode) => {
     if (node.type === "province") {
        setParentData({ id: node.id, name: node.name, code: node.code })
        setModalData(null)
        setActiveModal("district")
     } else if (node.type === "district") {
        setParentData({ id: node.id, name: node.name, code: node.code })
        setModalData(null)
        setActiveModal("subdistrict")
     } else if (node.type === "subdistrict") {
        setParentData({ id: node.id, name: node.name, code: node.code })
        setModalData(null)
        setActiveModal("village")
     }
  }

  const handleAddProvince = () => {
     setParentData(null)
     setModalData(null)
     setActiveModal("province")
  }
  
  const handleEdit = (node: RegionalNode) => {
     // Prepare the payload mimicking what the forms expect
     const editPayload: any = { id: node.id, name: node.name, code: node.code }
     
     if (node.type === "district") editPayload.provinceId = node.parentId
     if (node.type === "subdistrict") editPayload.districtId = node.parentId
     if (node.type === "village") editPayload.subDistrictId = node.parentId

     setModalData(editPayload)
     
     // Hacky bypassing of the Modal's strict parent array enforcement for Edits 
     // by extracting the parent code from the current node's full code path
     const parts = node.code.split('.')
     parts.pop() // remove current segment
     const parentCodeStr = parts.join('.')

     setParentData(node.parentId ? { id: node.parentId, code: parentCodeStr, name: "Parent" } : null)
     
     setActiveModal(node.type)
  }

  const handleDelete = async (node: RegionalNode) => {
     if (!confirm(`Are you sure you want to delete the ${node.type}: ${node.name}?`)) return
     
     let res
     if (node.type === "province") res = await deleteProvince(node.id)
     if (node.type === "district") res = await deleteDistrict(node.id)
     if (node.type === "subdistrict") res = await deleteSubDistrict(node.id)
     if (node.type === "village") res = await deleteVillage(node.id)

     if (res && !res.success) {
        alert(res.error)
     } else {
        // Simple client reload to reflect changes
        window.location.reload()
     }
  }

  const fetchChildren = async (node: RegionalNode): Promise<RegionalNode[]> => {
    let nextLevel: "province" | "district" | "subdistrict" | "village" | null = null
    
    if (node.type === "province") nextLevel = "district"
    else if (node.type === "district") nextLevel = "subdistrict"
    else if (node.type === "subdistrict") nextLevel = "village"
    
    if (!nextLevel) return []

    const result = await getRegionalTreeLevel(nextLevel, node.id)
    if (result.success && result.data) {
       // Append parentId mapping onto the node for later use in Edit modals
       return result.data.map(d => ({ ...d, parentId: node.id })) as RegionalNode[]
    }
    return []
  }

  const renderNode = (
    node: RegionalNode, 
    depth: number, 
    isExpanded: boolean, 
    toggleExpand: () => void
  ) => {
    const isLeaf = node.type === "village" 
    const Icon = node.type === 'province' ? Map : node.type === 'district' ? MapPin : node.type === 'subdistrict' ? Building2 : Home

    return (
      <div 
         className="group relative flex items-center justify-between rounded-lg py-2 px-2 hover:bg-muted/60 border border-transparent hover:border-border/60 transition-colors my-0.5"
         style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <button 
             onClick={toggleExpand} 
             disabled={isLeaf}
             className="h-6 w-6 shrink-0 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            {!isLeaf ? (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <span className="h-4 w-4" />
            )}
          </button>
          
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
          
          <span className="font-semibold text-sm truncate ml-1 text-foreground/90">
            {node.name}
          </span>
          <span className="hidden sm:inline-flex text-[11px] font-mono font-medium text-muted-foreground bg-muted/60 border px-1.5 py-0.5 rounded-md shadow-sm shrink-0 ml-2">
             {node.code}
          </span>
          <span className={`hidden xs:inline-flex text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 rounded-md shrink-0 ml-2 ${TYPE_COLORS[node.type]}`}>
             {node.type}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal border-b pb-2 mb-1">
                 <div className="font-semibold">{node.name}</div>
                 <div className="text-xs text-muted-foreground capitalize">{node.type} Options</div>
              </DropdownMenuLabel>
              {!isLeaf && (
                 <DropdownMenuItem onClick={() => handleAddChild(node)}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Add {node.type === 'province' ? 'District' : node.type === 'district' ? 'Sub-district' : 'Village'}</span>
                 </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleEdit(node)}>
                 <FileDown className="mr-2 h-4 w-4" />
                 <span>Edit Details</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                 className="text-red-600 focus:text-red-600 focus:bg-red-50"
                 onClick={() => handleDelete(node)}
              >
                 <Trash className="mr-2 h-4 w-4" />
                 <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  const handleCloseModal = () => {
     setActiveModal(null)
     // Reload page to reflect node changes smoothly within simple tree
     window.location.reload()
  }

  return (
    <div className="w-full max-w-7xl mx-auto bg-card rounded-lg border shadow-sm p-4 relative overflow-x-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-3 px-2">
         <div className="text-sm font-semibold text-muted-foreground shrink-0">Regional Hierarchy</div>
         <div className="flex flex-col w-full sm:w-auto sm:flex-row items-center gap-3">
           <div className="relative w-full sm:w-64">
             <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
             <Input 
               placeholder="Search area name..." 
               className="pl-8 h-8 text-sm w-full"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
             {isSearching && <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
           </div>
           <Button size="sm" onClick={handleAddProvince} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Province
           </Button>
         </div>
      </div>
      
      {/* Search results overlay inline, if typing */}
      {searchQuery.length >= 2 ? (
         <div className="py-2.5 px-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Search Results</h4>
            {searchResults.length === 0 && !isSearching ? (
               <div className="text-sm text-muted-foreground italic">No areas found matching "{searchQuery}"</div>
            ) : (
               <div className="space-y-1.5 flex flex-col items-start w-full">
                  {searchResults.map((resNode) => {
                     const ResIcon = resNode.type === 'province' ? Map : resNode.type === 'district' ? MapPin : resNode.type === 'subdistrict' ? Building2 : Home
                     
                     return (
                     <div key={resNode.id} className="w-full group relative flex items-center justify-between rounded-lg py-2 px-3 hover:bg-muted/60 border border-transparent hover:border-border/60 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden w-full">
                          <ResIcon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                          <div className="flex flex-col overflow-hidden text-left flex-1 items-start gap-0.5">
                             <div className="flex flex-wrap items-center gap-2 w-full">
                               <span className="font-semibold text-sm text-foreground/90">{resNode.name}</span>
                               <span className={`text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 rounded-md shrink-0 ${TYPE_COLORS[resNode.type as keyof typeof TYPE_COLORS]}`}>{resNode.type}</span>
                               <span className="hidden sm:inline-flex text-[11px] font-mono font-medium text-muted-foreground bg-muted/60 border px-1.5 py-0.5 rounded-md shadow-sm shrink-0">{resNode.code}</span>
                             </div>
                             <div className="text-[11px] text-muted-foreground/70 truncate w-full break-all">{resNode.path}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="font-normal border-b pb-2 mb-1">
                                 <div className="font-semibold">{resNode.name}</div>
                                 <div className="text-xs text-muted-foreground capitalize">{resNode.type} Options</div>
                              </DropdownMenuLabel>
                              {resNode.type !== 'village' && (
                                 <DropdownMenuItem onClick={() => handleAddChild(resNode)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>Add {resNode.type === 'province' ? 'District' : resNode.type === 'district' ? 'Sub-district' : 'Village'}</span>
                                 </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleEdit(resNode)}>
                                 <FileDown className="mr-2 h-4 w-4" />
                                 <span>Edit Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                 className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                 onClick={() => handleDelete(resNode)}
                              >
                                 <Trash className="mr-2 h-4 w-4" />
                                 <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                     </div>
                     )
                  })}
               </div>
            )}
         </div>
      ) : (
         <Tree 
            data={initialProvinces} 
            getChildren={fetchChildren} 
            renderNode={renderNode} 
         />
      )}

      {/* Render the appropriate modal based on state */}
      {activeModal === "province" && (
         <ProvinceFormModal 
            isOpen={true} 
            onClose={handleCloseModal} 
            initialData={modalData} 
         />
      )}
      
      {activeModal === "district" && (
         <DistrictFormModal 
            isOpen={true} 
            onClose={handleCloseModal} 
            initialData={modalData}
            // If parentData has an id, lock it in the form temporarily mock-feeding the required array
            provinces={parentData ? [parentData] : []} 
         />
      )}
      
      {activeModal === "subdistrict" && (
         <SubDistrictFormModal 
            isOpen={true} 
            onClose={handleCloseModal} 
            initialData={modalData}
            districts={parentData ? [parentData] : []} 
         />
      )}
      
      {activeModal === "village" && (
         <VillageFormModal 
            isOpen={true} 
            onClose={handleCloseModal} 
            initialData={modalData}
            subDistricts={parentData ? [parentData] : []} 
         />
      )}
    </div>
  )
}
