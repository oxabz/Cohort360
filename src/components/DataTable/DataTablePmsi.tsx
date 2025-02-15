import React from 'react'

import { CircularProgress, Grid, Typography, TableRow, TableCell } from '@material-ui/core'

import DataTable from 'components/DataTable/DataTable'

import { IClaim, IProcedure, ICondition } from '@ahryman40k/ts-fhir-types/lib/R4'
import { Column, Order, PMSIEntry } from 'types'

import useStyles from './styles'

type DataTablePmsiProps = {
  loading: boolean
  deidentified: boolean
  selectedTab: 'diagnostic' | 'ghm' | 'ccam'
  pmsiList: PMSIEntry<IProcedure | ICondition | IClaim>[]
  order: Order
  setOrder?: (order: Order) => void
  page?: number
  setPage?: (page: number) => void
  total?: number
}
const DataTablePmsi: React.FC<DataTablePmsiProps> = ({
  loading,
  deidentified,
  selectedTab,
  pmsiList,
  order,
  setOrder,
  page,
  setPage,
  total
}) => {
  const classes = useStyles()

  const columns = [
    { label: `NDA${deidentified ? ' chiffré' : ''}`, code: '', align: 'left', sortableColumn: false },
    { label: 'Codage le', code: 'date', align: 'center', sortableColumn: true },
    { label: 'Code', code: 'code', align: 'center', sortableColumn: true },
    { label: 'Libellé', code: '', align: 'center', sortableColumn: false },
    selectedTab === 'diagnostic' ? { label: 'Type', code: '', align: 'center', sortableColumn: false } : null,
    { label: 'Unité exécutrice', code: '', align: 'center', sortableColumn: false }
  ].filter((elem) => elem !== null) as Column[]

  return (
    <DataTable
      columns={columns}
      order={order}
      setOrder={setOrder}
      rowsPerPage={20}
      page={page}
      setPage={setPage}
      total={total}
    >
      {!loading && pmsiList && pmsiList.length > 0 ? (
        <>
          {pmsiList.map((pmsi) => {
            return <DataTablePmsiLine key={pmsi.id} pmsi={pmsi} selectedTab={selectedTab} />
          })}
        </>
      ) : (
        <TableRow className={classes.emptyTableRow}>
          <TableCell colSpan={6} align="left">
            <Grid container justifyContent="center">
              {loading ? (
                <CircularProgress />
              ) : (
                <Typography variant="button">{`Aucun ${
                  selectedTab !== 'diagnostic' ? (selectedTab !== 'ccam' ? 'ghm' : 'acte') : 'diagnostic'
                } à afficher`}</Typography>
              )}
            </Grid>
          </TableCell>
        </TableRow>
      )}
    </DataTable>
  )
}

const DataTablePmsiLine: React.FC<{
  pmsi: PMSIEntry<IProcedure | ICondition | IClaim>
  selectedTab: 'diagnostic' | 'ghm' | 'ccam'
}> = ({ pmsi, selectedTab }) => {
  const classes = useStyles()

  const nda = pmsi.NDA
  const date =
    pmsi.resourceType === 'Condition' && pmsi.recordedDate
      ? new Date(pmsi.recordedDate).toLocaleDateString('fr-FR') ?? 'Date inconnue'
      : pmsi.resourceType === 'Claim' && pmsi.created
      ? new Date(pmsi.created).toLocaleDateString('fr-FR') ?? 'Date inconnue'
      : pmsi.resourceType === 'Procedure' && pmsi.performedDateTime
      ? new Date(pmsi.performedDateTime).toLocaleDateString('fr-FR') ?? 'Date inconnue'
      : 'Date inconnue'

  const code =
    pmsi.resourceType === 'Claim'
      ? pmsi.diagnosis?.[0].packageCode?.coding?.[0].code
      : // @ts-ignore TODO: There is no class member in Conditon or Procedure FHIR types
        pmsi.class?.code || pmsi.code?.coding?.[0].code
  const libelle =
    pmsi.resourceType === 'Claim'
      ? pmsi.diagnosis?.[0].packageCode?.coding?.[0].display
      : // @ts-ignore TODO: There is no class member in Conditon or Procedure FHIR types
        pmsi.class?.code || pmsi.code?.coding?.[0].display
  const type = pmsi.extension ? pmsi.extension[0].valueString?.toUpperCase() : '-'
  const serviceProvider = pmsi.serviceProvider ?? 'Non renseigné'

  return (
    <TableRow className={classes.tableBodyRows} key={pmsi.id}>
      <TableCell align="left">{nda ?? 'Inconnu'}</TableCell>
      <TableCell align="center">{date}</TableCell>
      <TableCell align="center">
        <Typography className={classes.libelle}>{code}</Typography>
      </TableCell>
      <TableCell align="center">
        <Typography className={classes.libelle}>{libelle}</Typography>
      </TableCell>
      {selectedTab === 'diagnostic' && <TableCell align="center">{type}</TableCell>}
      <TableCell align="center">{serviceProvider ?? '-'}</TableCell>
    </TableRow>
  )
}

export default DataTablePmsi
