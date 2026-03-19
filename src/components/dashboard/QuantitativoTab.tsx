import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "./MetricCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";
import {
  useContasKpis, useContasAggMes, useContasTotalPorTipo,
  useCaptacaoKpis, useCaptacaoAggMes, useCaptacaoTreemap,
  useAucMesStackCasa, useAucCasaM0,
  useFaixaPlClientesMes, useFaixaPlAucMes,
  useReceitaTotal, useReceitaMesCategoria,
  useReceitaTreemapCategoria, useReceitaMatrizRows,
} from "@/hooks/useDashboardData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Treemap, LabelList,
} from "recharts";
import { ArrowUpRight, Users, TrendingUp, ChevronRight, ChevronDown } from "lucide-react";

const PBI_COLORS = [
  "#4472C4","#ED7D31","#A5A5A5","#FFC000","#5B9BD5",
  "#70AD47","#264478","#9B59B6","#636363","#D63B36",
  "#2E75B6","#C55A11","#7030A0","#00B0F0","#FF0000",
];
const CASA_COLORS: Record<string,string> = {
  "XP":"#4472C4","XP US":"#ED7D31","Avenue":"#A5A5A5",
  "Gestora":"#FFC000","Itaú":"#5B9BD5","Morgan Stanley":"#70AD47",
};

function fmtMi(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${v<0?"-":""}R$ ${(abs/1e6).toFixed(0)} Mi`;
  if (abs >= 1e3) return `${v<0?"-":""}R$ ${(abs/1e3).toFixed(0)} K`;
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(v);
}
function fmtFull(v: number) {
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(v);
}
function fmtKpi(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `R$ ${(v/1e6).toFixed(2).replace(".",",")} Mi`;
  return fmtFull(v);
}

function PbiCard({title,children,className}:{title:string;children:React.ReactNode;className?:string}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className??""}`}>
      <div className="px-3 py-1.5 border-b border-gray-100">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">{title}</p>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

const CustomTooltip = ({active,payload,label}:any) => {
  if (!active||!payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded px-2.5 py-1.5 shadow-md text-[10px]">
      <p className="font-semibold mb-0.5 text-gray-800">{label}</p>
      {payload.map((p:any,i:number)=>(
        <p key={i} style={{color:p.color}}>
          {p.name}: {typeof p.value==="number"&&Math.abs(p.value)>100?fmtFull(p.value):p.value}
        </p>
      ))}
    </div>
  );
};

const Percent100Tooltip = ({active,payload,label}:any) => {
  if (!active||!payload?.length) return null;
  const total = payload.reduce((s:number,p:any)=>s+(Number(p.value)||0),0);
  return (
    <div className="bg-white border border-gray-200 rounded px-2.5 py-1.5 shadow-md text-[10px]">
      <p className="font-semibold mb-0.5 text-gray-800">{label}</p>
      {payload.map((p:any,i:number)=>(
        <p key={i} style={{color:p.color}}>{p.name}: {total>0?((p.value/total)*100).toFixed(1):0}%</p>
      ))}
    </div>
  );
};

const BarTopLabel = ({x,y,width,value}:any) => {
  if (!value||Math.abs(value)<1) return null;
  const abs = Math.abs(value);
  const lbl = abs>=1e6?`${(value/1e6).toFixed(0)}Mi`:abs>=1e3?`${(value/1e3).toFixed(0)}K`:String(Math.round(value));
  return <text x={x+width/2} y={y-3} textAnchor="middle" fill="#374151" fontSize={8} fontWeight="600">{lbl}</text>;
};

const TreemapContent = ({x,y,width,height,name,value,index}:any) => {
  if (width<30||height<20) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={PBI_COLORS[index%PBI_COLORS.length]} stroke="#fff" strokeWidth={2} rx={2}/>
      {width>40&&height>25&&(
        <>
          <text x={x+width/2} y={y+height/2-6} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold">{name}</text>
          <text x={x+width/2} y={y+height/2+8} textAnchor="middle" fill="#fff" fontSize={8}>{fmtMi(value)}</text>
        </>
      )}
    </g>
  );
};

function pivotDesc<T extends Record<string,any>>(
  data:T[],anoMesKey:string,nomeKey:string,seriesKey:string,valueKey:string
):{rows:Record<string,any>[];series:string[]} {
  const seriesSet = new Set<string>();
  const map = new Map<number,Record<string,any>>();
  [...data].sort((a,b)=>(b[anoMesKey]||0)-(a[anoMesKey]||0)).forEach(r=>{
    const anomes=r[anoMesKey]; const nome=r[nomeKey]??""; const ser=r[seriesKey]??"Outros";
    seriesSet.add(ser);
    if (!map.has(anomes)) map.set(anomes,{_cat:nome,_anomes:anomes});
    const row=map.get(anomes)!;
    row[ser]=(row[ser]||0)+(Number(r[valueKey])||0);
  });
  return {rows:[...map.values()],series:[...seriesSet].sort()};
}

interface MatrizNode {key:string;label:string;depth:number;values:Record<string,number>;total:number;children:MatrizNode[];}

function buildMatrizTree(data:any[]):{tree:MatrizNode[];meses:string[]} {
  const sorted=[...data].sort((a,b)=>(b.anomes||0)-(a.anomes||0));
  const mesesMap=new Map<number,string>();
  sorted.forEach(r=>{if(!mesesMap.has(r.anomes))mesesMap.set(r.anomes,r.anomes_nome||String(r.anomes));});
  const meses=[...mesesMap.entries()].sort((a,b)=>b[0]-a[0]).map(([,n])=>n);
  const catMap=new Map<string,any>();
  sorted.forEach(r=>{
    const cat=r.categoria||"N/D",sub=r.subcategoria||"",prod=r.produto||"";
    const mes=r.anomes_nome||String(r.anomes),val=Number(r.valor)||0;
    if(!catMap.has(cat))catMap.set(cat,{total:0,values:{},children:new Map()});
    const c=catMap.get(cat)!;c.total+=val;c.values[mes]=(c.values[mes]||0)+val;
    const sk=`${cat}|${sub}`;
    if(!c.children.has(sk))c.children.set(sk,{label:sub||"(sem sub)",total:0,values:{},children:new Map()});
    const s=c.children.get(sk)!;s.total+=val;s.values[mes]=(s.values[mes]||0)+val;
    const pk=`${sk}|${prod}`;
    if(!s.children.has(pk))s.children.set(pk,{label:prod||"(sem produto)",total:0,values:{},children:new Map()});
    const p=s.children.get(pk)!;p.total+=val;p.values[mes]=(p.values[mes]||0)+val;
  });
  const toNodes=(map:Map<string,any>,depth:number,prefix=""):MatrizNode[]=>[...map.entries()].map(([k,v])=>({
    key:prefix+k,label:depth===0?k.split("|").pop()!:v.label,depth,values:v.values,total:v.total,
    children:v.children?toNodes(v.children,depth+1,k+"|"):[],
  })).sort((a,b)=>b.total-a.total);
  return {tree:toNodes(catMap,0),meses};
}

function MatrizRow({node,meses,expanded,toggle}:{node:MatrizNode;meses:string[];expanded:Set<string>;toggle:(k:string)=>void}) {
  const isOpen=expanded.has(node.key);
  const bg=["#EEF2FF","#F9FAFB","#FFFFFF","#FFFFFF"][node.depth]??"#FFFFFF";
  return (
    <>
      <TableRow style={{backgroundColor:bg}}>
        <TableCell className="text-[10px] py-0.5 sticky left-0 whitespace-nowrap"
          style={{paddingLeft:node.depth*16+8,backgroundColor:bg,fontWeight:node.depth<2?700:400}}>
          {node.children.length>0?(
            <button onClick={()=>toggle(node.key)} className="inline-flex items-center gap-0.5 hover:text-primary">
              {isOpen?<ChevronDown className="h-3 w-3"/>:<ChevronRight className="h-3 w-3"/>}{node.label}
            </button>
          ):<span className="pl-4">{node.label}</span>}
        </TableCell>
        {meses.map(m=>(
          <TableCell key={m} className="text-[10px] py-0.5 text-right">
            {node.values[m]?fmtFull(node.values[m]):"—"}
          </TableCell>
        ))}
        <TableCell className="text-[10px] py-0.5 text-right font-bold">{fmtFull(node.total)}</TableCell>
      </TableRow>
      {isOpen&&node.children.map(child=>(
        <MatrizRow key={child.key} node={child} meses={meses} expanded={expanded} toggle={toggle}/>
      ))}
    </>
  );
}

interface Props {filters:DashboardFilters;}

export function QuantitativoTab({filters}:Props) {
  const {data:kpis,isLoading:l1}=useContasKpis(filters);
  const {data:contasAgg,isLoading:l2}=useContasAggMes(filters);
  const {data:contasTipo,isLoading:l3}=useContasTotalPorTipo(filters);
  const {data:captKpis,isLoading:l4}=useCaptacaoKpis(filters);
  const {data:captAggMes,isLoading:l5}=useCaptacaoAggMes(filters);
  const {data:captTreemap,isLoading:l6}=useCaptacaoTreemap(filters);
  const {data:aucStackCasa,isLoading:l7}=useAucMesStackCasa(filters);
  const {data:aucCasaM0,isLoading:l8}=useAucCasaM0(filters);
  const {data:faixaCliMes,isLoading:l9}=useFaixaPlClientesMes(filters);
  const {data:faixaAucMes,isLoading:l10}=useFaixaPlAucMes(filters);
  const {data:receitaTotalData,isLoading:l11}=useReceitaTotal(filters);
  const {data:receitaMesCat,isLoading:l12}=useReceitaMesCategoria(filters);
  const {data:receitaTreemap,isLoading:l13}=useReceitaTreemapCategoria(filters);
  const {data:receitaMatrizRows,isLoading:l14}=useReceitaMatrizRows(filters);

  const loading=[l1,l2,l3,l4,l5,l6,l7,l8,l9,l10,l11,l12,l13,l14].some(Boolean);

  const contasComTotal=useMemo(()=>{
    if(!contasAgg?.length) return [];
    const map=new Map<number,any>();
    contasAgg.forEach((r:any)=>{
      if(!map.has(r.anomes))map.set(r.anomes,{_cat:r.anomes_nome,Ativação:0,Habilitação:0,Migração:0});
      const row=map.get(r.anomes)!,t=(r.tipo||"").toLowerCase();
      if(t.includes("ativa"))row.Ativação+=Number(r.qtd)||0;
      else if(t.includes("habilit"))row.Habilitação+=Number(r.qtd)||0;
      else if(t.includes("migra"))row.Migração+=Number(r.qtd)||0;
    });
    return [...map.entries()].sort((a,b)=>b[0]-a[0]).map(([,v])=>({...v,_total:(v.Ativação||0)+(v.Habilitação||0)+(v.Migração||0)}));
  },[contasAgg]);

  const {totalPorTipo,casasContas}=useMemo(()=>{
    if(!contasTipo?.length) return {totalPorTipo:[],casasContas:[] as string[]};
    const casaSet=new Set<string>();const tipoMap=new Map<string,any>();
    contasTipo.forEach((r:any)=>{
      casaSet.add(r.casa||"Outros");if(!tipoMap.has(r.tipo))tipoMap.set(r.tipo,{});
      tipoMap.get(r.tipo)![r.casa||"Outros"]=(tipoMap.get(r.tipo)![r.casa||"Outros"]||0)+(Number(r.qtd)||0);
    });
    return {totalPorTipo:[...tipoMap.entries()].map(([tipo,casas])=>({tipo,...casas})),casasContas:[...casaSet].sort()};
  },[contasTipo]);

  const {captacaoPorMes,captacaoTipos}=useMemo(()=>{
    if(!captAggMes?.length) return {captacaoPorMes:[],captacaoTipos:[] as string[]};
    const tipos=new Set<string>();const map=new Map<number,any>();
    captAggMes.forEach((r:any)=>{
      const tipo=r.tipo_captacao||"Outros";tipos.add(tipo);
      if(!map.has(r.anomes))map.set(r.anomes,{_cat:r.anomes_nome,_total:0});
      const row=map.get(r.anomes)!;row[tipo]=(row[tipo]||0)+(Number(r.valor)||0);row._total=(row._total||0)+(Number(r.valor)||0);
    });
    return {captacaoPorMes:[...map.entries()].sort((a,b)=>b[0]-a[0]).map(([,v])=>v),captacaoTipos:[...tipos].sort()};
  },[captAggMes]);

  const captacaoPorTipo=useMemo(()=>
    captTreemap?.map((r:any)=>({name:r.tipo_captacao||"Outros",value:Math.abs(Number(r.valor)||0)}))??[],[captTreemap]);

  const {aucPorMes,aucCasas}=useMemo(()=>{
    if(!aucStackCasa?.length) return {aucPorMes:[],aucCasas:[] as string[]};
    const {rows,series}=pivotDesc(aucStackCasa,"anomes","anomes_nome","casa","auc");
    return {aucPorMes:rows.map(r=>({...r,_total:series.reduce((s,c)=>s+(r[c]||0),0)})),aucCasas:series};
  },[aucStackCasa]);

  const aucCasaData=useMemo(()=>aucCasaM0?.map((r:any)=>({name:r.casa||"Outros",value:Number(r.auc)||0}))??[],[aucCasaM0]);

  const {faixaCliRows,faixaAucRows,faixaSeries}=useMemo(()=>{
    if(!faixaCliMes?.length) return {faixaCliRows:[],faixaAucRows:[],faixaSeries:[] as string[]};
    const sc=[...faixaCliMes].sort((a:any,b:any)=>(b.anomes||0)-(a.anomes||0));
    const {rows:cliRows,series}=pivotDesc(sc,"anomes","anomes_nome","faixa_pl","clientes");
    const ordemMap=new Map<string,number>();sc.forEach((r:any)=>{if(!ordemMap.has(r.faixa_pl))ordemMap.set(r.faixa_pl,r.ordem_pl||0);});
    const ss=[...series].sort((a,b)=>(ordemMap.get(a)||0)-(ordemMap.get(b)||0));
    const sa=[...(faixaAucMes||[])].sort((a:any,b:any)=>(b.anomes||0)-(a.anomes||0));
    const {rows:aucRows}=pivotDesc(sa,"anomes","anomes_nome","faixa_pl","auc");
    return {faixaCliRows:cliRows,faixaAucRows:aucRows,faixaSeries:ss};
  },[faixaCliMes,faixaAucMes]);

  const {receitaPorMes,receitaCats}=useMemo(()=>{
    if(!receitaMesCat?.length) return {receitaPorMes:[],receitaCats:[] as string[]};
    const {rows,series}=pivotDesc(receitaMesCat,"anomes","anomes_nome","categoria","valor");
    return {receitaPorMes:rows.map(r=>({...r,_total:series.reduce((s,c)=>s+(r[c]||0),0)})),receitaCats:series};
  },[receitaMesCat]);

  const receitaPorCategoria=useMemo(()=>
    receitaTreemap?.map((r:any)=>({name:r.categoria||"Outros",value:Math.abs(Number(r.valor)||0)}))??[],[receitaTreemap]);

  const {matrizTree,matrizMeses}=useMemo(()=>{
    if(!receitaMatrizRows?.length) return {matrizTree:[] as MatrizNode[],matrizMeses:[] as string[]};
    return buildMatrizTree(receitaMatrizRows);
  },[receitaMatrizRows]);

  const [matrizExpanded,setMatrizExpanded]=useState<Set<string>>(new Set());
  const toggleMatriz=(key:string)=>setMatrizExpanded(prev=>{const n=new Set(prev);n.has(key)?n.delete(key):n.add(key);return n;});

  if(loading) return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-20"/>)}</div>
      {[...Array(5)].map((_,i)=><Skeleton key={i} className="h-64"/>)}
    </div>
  );

  const CM={top:18,right:10,left:0,bottom:5};

  return (
    <div className="space-y-3">

      <div className="grid grid-cols-3 gap-2">
        <MetricCard title="Migração"    value={kpis?.migracao    ?? 0} icon={Users}/>
        <MetricCard title="Habilitação" value={kpis?.habilitacao ?? 0} icon={Users}/>
        <MetricCard title="Ativação"    value={kpis?.ativacao    ?? 0} icon={Users}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2">
          <PbiCard title="Contas">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={contasComTotal} margin={CM}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB"/>
                <XAxis dataKey="_cat" tick={{fontSize:9,fill:"#6B7280"}}/>
                <YAxis tick={{fontSize:9,fill:"#6B7280"}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{fontSize:10}}/>
                <Bar dataKey="Ativação"    stackId="a" fill={PBI_COLORS[0]}/>
                <Bar dataKey="Habilitação" stackId="a" fill={PBI_COLORS[1]}/>
                <Bar dataKey="Migração"    stackId="a" fill={PBI_COLORS[2]} radius={[2,2,0,0]}>
                  <LabelList dataKey="_total" content={<BarTopLabel/>}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </PbiCard>
        </div>
        <PbiCard title="Total por Tipo">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={totalPorTipo} layout="vertical" margin={{top:5,right:30,left:65,bottom:5}}>
              <XAxis type="number" hide/>
              <YAxis type="category" dataKey="tipo" tick={{fontSize:9,fill:"#6B7280"}} width={60}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{fontSize:9}} formatter={(v)=><span style={{color:CASA_COLORS[v]||"#374151"}}>{v}</span>}/>
              {casasContas.map((casa)=>(
                <Bar key={casa} dataKey={casa} stackId="a" fill={CASA_COLORS[casa]||PBI_COLORS[casasContas.indexOf(casa)%PBI_COLORS.length]}/>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard title="Captação Líq. MTD" value={fmtKpi(captKpis?.captacao_mtd??0)} icon={ArrowUpRight}/>
        <MetricCard title="Captação Líq. YTD" value={fmtKpi(captKpis?.captacao_ytd??0)} icon={TrendingUp}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2">
          <PbiCard title="Captação por Mês">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={captacaoPorMes} margin={CM}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB"/>
                <XAxis dataKey="_cat" tick={{fontSize:9,fill:"#6B7280"}}/>
                <YAxis tick={{fontSize:9,fill:"#6B7280"}} tickFormatter={v=>`${(v/1e6).toFixed(0)}M`}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{fontSize:9}}/>
                {captacaoTipos.map((tipo,i)=>(
                  <Bar key={tipo} dataKey={tipo} stackId="a" fill={PBI_COLORS[i%PBI_COLORS.length]}
                    radius={i===captacaoTipos.length-1?[2,2,0,0]:undefined}>
                    {i===captacaoTipos.length-1&&<LabelList dataKey="_total" content={<BarTopLabel/>}/>}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </PbiCard>
        </div>
        <PbiCard title="Tipo de Captação">
          <ResponsiveContainer width="100%" height={250}>
            <Treemap data={captacaoPorTipo} dataKey="value" aspectRatio={1} content={<TreemapContent/>}/>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="AuC por Mês">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={aucPorMes} margin={CM}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB"/>
              <XAxis dataKey="_cat" tick={{fontSize:9,fill:"#6B7280"}}/>
              <YAxis tick={{fontSize:9,fill:"#6B7280"}} tickFormatter={v=>`${(v/1e6).toFixed(0)}M`}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {aucCasas.map((casa,i)=>(
                <Bar key={casa} dataKey={casa} stackId="a" fill={CASA_COLORS[casa]||PBI_COLORS[i%PBI_COLORS.length]}
                  radius={i===aucCasas.length-1?[2,2,0,0]:undefined}>
                  {i===aucCasas.length-1&&<LabelList dataKey="_total" content={<BarTopLabel/>}/>}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>

        <PbiCard title="AuC por Casa (M0)">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={aucCasaData} dataKey="value" nameKey="name" cx="50%" cy="45%"
                outerRadius={80} innerRadius={45} labelLine={false}
                label={({cx,cy,midAngle,outerRadius,name,percent})=>{
                  if(percent<0.03) return null;
                  const R=Math.PI/180,x=cx+(outerRadius+18)*Math.cos(-midAngle*R),y=cy+(outerRadius+18)*Math.sin(-midAngle*R);
                  return <text x={x} y={y} textAnchor={x>cx?"start":"end"} fill="#374151" fontSize={9}>{`${name} (${(percent*100).toFixed(1)}%)`}</text>;
                }}>
                {aucCasaData.map((e,i)=><Cell key={i} fill={CASA_COLORS[e.name]||PBI_COLORS[i%PBI_COLORS.length]}/>)}
              </Pie>
              <Legend wrapperStyle={{fontSize:9}}/>
              <Tooltip formatter={(v:number)=>fmtFull(v)}/>
            </PieChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="# de Cliente por Faixa de PL">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={faixaCliRows} stackOffset="expand" margin={CM}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB"/>
              <XAxis dataKey="_cat" tick={{fontSize:9,fill:"#6B7280"}}/>
              <YAxis tick={{fontSize:9,fill:"#6B7280"}} tickFormatter={v=>`${(v*100).toFixed(0)}%`}/>
              <Tooltip content={<Percent100Tooltip/>}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {faixaSeries.map((faixa,i)=>(
                <Bar key={faixa} dataKey={faixa} stackId="a" fill={PBI_COLORS[i%PBI_COLORS.length]}/>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="AuC por Faixa de PL">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={faixaAucRows} stackOffset="expand" margin={CM}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB"/>
              <XAxis dataKey="_cat" tick={{fontSize:9,fill:"#6B7280"}}/>
              <YAxis tick={{fontSize:9,fill:"#6B7280"}} tickFormatter={v=>`${(v*100).toFixed(0)}%`}/>
              <Tooltip content={<Percent100Tooltip/>}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {faixaSeries.map((faixa,i)=>(
                <Bar key={faixa} dataKey={faixa} stackId="a" fill={PBI_COLORS[i%PBI_COLORS.length]}/>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
      </div>

      <MetricCard title="Receita Bruta Tailor" value={fmtKpi(receitaTotalData?.receita??0)} icon={TrendingUp}/>

      <PbiCard title="Receita Bruta Tailor (estimada)">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow style={{backgroundColor:"#1B2A3D"}}>
                <TableHead className="text-[10px] py-1.5 sticky left-0 text-white font-bold min-w-[200px]" style={{backgroundColor:"#1B2A3D"}}>
                  Categoria / Produto
                </TableHead>
                {matrizMeses.map(m=>(
                  <TableHead key={m} className="text-[10px] py-1.5 text-right text-white font-semibold whitespace-nowrap">{m}</TableHead>
                ))}
                <TableHead className="text-[10px] py-1.5 text-right text-white font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrizTree.length>0&&(()=>{
                const gt=matrizTree.reduce((s,n)=>s+n.total,0);
                const mt:Record<string,number>={};
                matrizTree.forEach(n=>matrizMeses.forEach(m=>{mt[m]=(mt[m]||0)+(n.values[m]||0);}));
                return (
                  <TableRow style={{backgroundColor:"#E8EDF3"}}>
                    <TableCell className="text-[10px] py-1 sticky left-0 font-bold" style={{backgroundColor:"#E8EDF3"}}>Total</TableCell>
                    {matrizMeses.map(m=>(
                      <TableCell key={m} className="text-[10px] py-1 text-right font-bold">{fmtFull(mt[m]||0)}</TableCell>
                    ))}
                    <TableCell className="text-[10px] py-1 text-right font-bold">{fmtFull(gt)}</TableCell>
                  </TableRow>
                );
              })()}
              {matrizTree.map(node=>(
                <MatrizRow key={node.key} node={node} meses={matrizMeses} expanded={matrizExpanded} toggle={toggleMatriz}/>
              ))}
            </TableBody>
          </Table>
        </div>
      </PbiCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PbiCard title="Receita Bruta Tailor (estimada)">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={receitaPorMes} margin={CM}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB"/>
              <XAxis dataKey="_cat" tick={{fontSize:9,fill:"#6B7280"}}/>
              <YAxis tick={{fontSize:9,fill:"#6B7280"}} tickFormatter={v=>`${(v/1e6).toFixed(1)}M`}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {receitaCats.map((cat,i)=>(
                <Bar key={cat} dataKey={cat} stackId="a" fill={PBI_COLORS[i%PBI_COLORS.length]}
                  radius={i===receitaCats.length-1?[2,2,0,0]:undefined}>
                  {i===receitaCats.length-1&&<LabelList dataKey="_total" content={<BarTopLabel/>}/>}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </PbiCard>
        <PbiCard title="Soma de Comissão Bruta Tailor por Categoria">
          <ResponsiveContainer width="100%" height={250}>
            <Treemap data={receitaPorCategoria} dataKey="value" aspectRatio={1} content={<TreemapContent/>}/>
          </ResponsiveContainer>
        </PbiCard>
      </div>

    </div>
  );
}
