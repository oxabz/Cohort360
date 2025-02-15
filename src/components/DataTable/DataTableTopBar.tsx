import React, { useState, useEffect } from 'react'

import Button from '@material-ui/core/Button'
import Grid from '@material-ui/core/Grid'
import Tab from '@material-ui/core/Tab'
import Tabs from '@material-ui/core/Tabs'
import Typography from '@material-ui/core/Typography'
import IconButton from '@material-ui/core/IconButton'
import InputAdornment from '@material-ui/core/InputAdornment'
import InputBase from '@material-ui/core/InputBase'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'

import ClearIcon from '@material-ui/icons/Clear'
import { ReactComponent as SearchIcon } from 'assets/icones/search.svg'

import InputSearchDocumentSimple from 'components/Inputs/InputSearchDocument/components/InputSearchDocumentSimple'

import {
  SearchByTypes,
  DTTB_TabsType as TabsType,
  DTTB_ResultsType as ResultsType,
  DTTB_SearchBarType as SearchBarType,
  DTTB_ButtonType as ButtonType,
  errorDetails
} from 'types'

import displayDigit from 'utils/displayDigit'

import useStyles from './styles'
import { CircularProgress } from '@material-ui/core'

type DataTableTopBarProps = {
  loading: boolean
  tabs?: TabsType
  results?: ResultsType | ResultsType[]
  searchBar?: SearchBarType
  buttons?: ButtonType[]
}
const DataTableTopBar: React.FC<DataTableTopBarProps> = ({ loading, tabs, results, searchBar, buttons }) => {
  const classes = useStyles()

  const [search, setSearch] = useState(searchBar?.value ?? '')
  const [searchBy, setSearchBy] = useState<SearchByTypes>(SearchByTypes.text)

  const onSearch = (newInput = search) => {
    if (searchBar && searchBar.onSearch && typeof searchBar.onSearch === 'function') {
      searchBar.onSearch(newInput, searchBy)
    }
  }

  const handleChangeSelect = (
    event: React.ChangeEvent<{
      name?: string | undefined
      value: unknown
    }>
  ) => {
    setSearchBy(event.target.value as SearchByTypes)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSearch()
    }
  }

  useEffect(() => {
    setSearch(searchBar?.value ?? '')
  }, [searchBar, searchBar && searchBar?.value])

  return (
    <>
      <Grid container justifyContent="space-between" alignItems="flex-end" style={{ marginBlock: 8 }}>
        {tabs && tabs?.list?.length > 0 && (
          <Grid id="DTTB_tabs" item>
            <Tabs
              classes={{
                root: classes.tabsContainer,
                indicator: classes.indicator
              }}
              value={tabs.value}
              onChange={tabs?.onChange}
            >
              {tabs.list.map((tab, index) => (
                <Tab
                  key={index}
                  label={tab.label}
                  value={tab.value}
                  icon={tab.icon}
                  wrapped={tab.wrapped ?? false}
                  classes={{ selected: classes.selected }}
                  className={classes.tabTitle}
                />
              ))}
            </Tabs>
          </Grid>
        )}
        {loading ? (
          <CircularProgress />
        ) : (
          results && (
            <Grid id="DTTB_result" item container direction="column" style={{ width: 'fit-content' }}>
              {Array.isArray(results) && results.length > 0 ? (
                <>
                  {results.map((result, index) => (
                    <Typography key={index} variant="button">
                      {displayDigit(result.nb ?? 0)} / {displayDigit(result.total ?? 0)} {result.label}
                    </Typography>
                  ))}
                </>
              ) : (
                <Typography variant="button">
                  {/* @ts-ignore */}
                  {displayDigit(results.nb ?? 0)} / {displayDigit(results.total ?? 0)} {results.label}
                </Typography>
              )}
            </Grid>
          )
        )}

        {((searchBar && searchBar.type !== 'document') || (buttons && buttons?.length > 0)) && (
          <Grid container item direction="row" alignItems="center" style={{ width: 'fit-content' }} wrap="nowrap">
            {searchBar && searchBar.type !== 'document' && (
              <Grid id="DTTB_search" container alignItems="center" direction="row" wrap="nowrap">
                {searchBar.type === 'patient' && (
                  <Select value={searchBy} onChange={handleChangeSelect} className={classes.select}>
                    <MenuItem value={SearchByTypes.text}>Tous les champs</MenuItem>
                    <MenuItem value={SearchByTypes.family}>Nom</MenuItem>
                    <MenuItem value={SearchByTypes.given}>Prénom</MenuItem>
                    <MenuItem value={SearchByTypes.identifier}>IPP</MenuItem>
                  </Select>
                )}
                <Grid item container xs={10} alignItems="center" className={classes.searchBar}>
                  <InputBase
                    placeholder="Rechercher"
                    className={classes.input}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={onKeyDown}
                    endAdornment={
                      <InputAdornment position="end">
                        {search && (
                          <IconButton
                            onClick={() => {
                              setSearch('')
                              onSearch('')
                            }}
                          >
                            <ClearIcon />
                          </IconButton>
                        )}
                      </InputAdornment>
                    }
                  />
                  <IconButton type="submit" aria-label="search" onClick={() => onSearch()}>
                    <SearchIcon fill="#ED6D91" height="15px" />
                  </IconButton>
                </Grid>
              </Grid>
            )}

            {((buttons && buttons?.length > 0) || (searchBar && searchBar.type === 'document')) && (
              <Grid id="DTTB_btn">
                {buttons &&
                  buttons?.length > 0 &&
                  buttons.map((button, index) => (
                    <Button
                      key={index}
                      variant="contained"
                      disableElevation
                      startIcon={button.icon}
                      className={classes.searchButton}
                      onClick={button.onClick}
                    >
                      {button.label}
                    </Button>
                  ))}
              </Grid>
            )}
          </Grid>
        )}
      </Grid>

      {searchBar && searchBar.type === 'document' && (
        <InputSearchDocumentSimple
          defaultSearchInput={search}
          setDefaultSearchInput={(newSearchInput: string) => setSearch(newSearchInput)}
          onSearchDocument={(newInputText: string) => onSearch(newInputText)}
          error={searchBar.error?.isError}
        />
      )}

      {searchBar && searchBar.error?.isError && (
        <Grid className={classes.errorContainer}>
          <Typography style={{ fontWeight: 'bold' }}>Des erreurs ont été détectées dans votre recherche :</Typography>
          {searchBar.error?.errorsDetails &&
            searchBar.error?.errorsDetails.map((detail: errorDetails, count: number) => (
              <Typography key={count}>
                {`- ${
                  detail.errorPositions && detail.errorPositions.length > 0
                    ? detail.errorPositions.length === 1
                      ? `Au caractère ${detail.errorPositions[0]} : `
                      : `Aux caractères ${detail.errorPositions.join(', ')} : `
                    : ''
                }
              ${detail.errorName ? `${detail.errorName}.` : ''}
              ${detail.errorSolution ? `${detail.errorSolution}.` : ''}`}
              </Typography>
            ))}
        </Grid>
      )}
    </>
  )
}

export default DataTableTopBar
