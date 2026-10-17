'use client';
import {useParams} from 'next/navigation';
import {OperationsScreen} from '@/components/admin/operations-screen';
export default function OperationsPage(){const params=useParams();return <OperationsScreen section={String(params.section)}/>;}
