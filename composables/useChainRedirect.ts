import { Prefix } from '@kodadot1/static'
import {
  createVisible,
  explorerVisible,
  hotVisible,
  identityVisible,
  massmintCreateVisible,
  profileVisible,
  salesVisible,
  seriesInsightVisible,
  transferVisible,
} from '@/utils/config/permision.config'

enum RedirectTypes {
  CHAIN_PREFIX_CHANGE = 'chain-prefix-change',
  STAY = 'stay',
  WALLET_ADDRESS_CHANGE = 'wallet-address-change',
}

/**
 * Enum representing different page types for routing and matching.
 * You can use placeholders using curly braces {} for dynamic parts.
 * For example, '{prefix}-explore-items' contains a '{prefix}' placeholder
 * that {prefix} will be treated as any value for exmaple rmrk-explore-items
 */
enum PageType {
  PREFIX_EXPLORE_ITEMS = '/{prefix}/explore-items',
  PREFIX_EXPLORE_COLLECTIBLES = '/{prefix}/explore-collectibles',
  SALES = '/sales',
  HOT = '/hot',
  SERIES_INSIGHT = '/series-insight',
  BLOG = '/blog',
  BLOG_SLUG = '/blog/{slug}', // Assuming you have a dynamic slug for blogs
  PREFIX_MASSMINT = '/{prefix}/massmint',
  PREFIX_MASSMINT_ONBOARDING = '/{prefix}/massmint-onboarding',
  PREFIX_CLASSIC_CREATE = '/{prefix}/create',
  PREFIX_TRANSFER = '/{prefix}/transfer',
  IDENTITY = '/identity',
  PROFILE = '/{prefix}/u/{wallet}',
}

type RedirectPath = {
  path: string
  query?: {
    [key: string]: any
  }
}

const PageRedirectType: { [key in PageType]?: RedirectTypes[] } = {
  [PageType.PREFIX_EXPLORE_ITEMS]: [RedirectTypes.CHAIN_PREFIX_CHANGE],
  [PageType.PREFIX_EXPLORE_COLLECTIBLES]: [RedirectTypes.CHAIN_PREFIX_CHANGE],
  [PageType.SALES]: [RedirectTypes.STAY],
  [PageType.HOT]: [RedirectTypes.STAY],
  [PageType.SERIES_INSIGHT]: [RedirectTypes.STAY],
  [PageType.BLOG]: [RedirectTypes.STAY],
  [PageType.BLOG_SLUG]: [RedirectTypes.STAY],
  [PageType.PREFIX_MASSMINT]: [RedirectTypes.CHAIN_PREFIX_CHANGE],
  [PageType.PREFIX_MASSMINT_ONBOARDING]: [RedirectTypes.CHAIN_PREFIX_CHANGE],
  [PageType.PREFIX_CLASSIC_CREATE]: [RedirectTypes.CHAIN_PREFIX_CHANGE],
  [PageType.PREFIX_TRANSFER]: [RedirectTypes.CHAIN_PREFIX_CHANGE],
  [PageType.IDENTITY]: [RedirectTypes.STAY],
  [PageType.PROFILE]: [
    RedirectTypes.CHAIN_PREFIX_CHANGE,
    RedirectTypes.WALLET_ADDRESS_CHANGE,
  ],
}

function getEnumKeyByValue<
  T extends { [key: string]: string },
  K extends keyof T
>(enumObject: T, value: string): K | undefined {
  return Object.keys(enumObject).find((key) => enumObject[key] === value) as K
}

const SpecialRedirectPageTypes: PageType[] = Object.keys(PageRedirectType)
  .map<PageType>((value) => getEnumKeyByValue(PageType, value) as PageType)
  .filter(Boolean) as PageType[]

const pageAvailabilityPerChain = {
  [PageType.PREFIX_EXPLORE_ITEMS]: (chain: Prefix): boolean =>
    explorerVisible(chain),
  [PageType.PREFIX_EXPLORE_COLLECTIBLES]: (chain: Prefix): boolean =>
    explorerVisible(chain),
  [PageType.SERIES_INSIGHT]: (chain: Prefix) => seriesInsightVisible(chain),
  [PageType.PREFIX_CLASSIC_CREATE]: (chain: Prefix) => createVisible(chain),
  [PageType.PREFIX_MASSMINT]: (chain: Prefix) => massmintCreateVisible(chain),
  [PageType.PREFIX_MASSMINT_ONBOARDING]: (chain: Prefix) =>
    massmintCreateVisible(chain),
  [PageType.SALES]: (chain: Prefix) => salesVisible(chain),
  [PageType.HOT]: (chain: Prefix) => hotVisible(chain),
  [PageType.BLOG]: () => true,
  [PageType.BLOG_SLUG]: () => true,
  [PageType.PREFIX_TRANSFER]: (chain: Prefix) => transferVisible(chain),
  [PageType.IDENTITY]: (chain: Prefix) => identityVisible(chain),
  [PageType.PROFILE]: (chain: Prefix) => profileVisible(chain),
}

const generateRouteRegexPattern = (pattern: string): string => {
  const patternWithPlaceholderReplaced = pattern.replace(
    /\{[^}]{1,30}\}/g,
    '[^/]+'
  )
  const patternWithSlashesEscaped = patternWithPlaceholderReplaced.replace(
    /\//g,
    '\\/'
  )
  return `^${patternWithSlashesEscaped}$`
}

const getPageType = (routeName: string): PageType => {
  const matchingKey = Object.keys(PageType).find((key) => {
    const pagePattern = PageType[key]
    const regexPattern = generateRouteRegexPattern(pagePattern)
    return new RegExp(regexPattern).test(routeName)
  })

  return matchingKey as PageType
}

interface ChainParams {
  newChain: Prefix
  prevChain: Prefix
}

export default function (allowRedirectIfCheckNotPresent = false) {
  const route = useRoute()
  const { accountId } = useAuth()

  const getChangedChainPrefixFromPath = (
    chainParams: ChainParams,
    initialPath: RedirectPath
  ): RedirectPath => ({
    path: initialPath.path.replace(chainParams.prevChain, chainParams.newChain),
    query: initialPath.query,
  })

  const updatePathWithCurrentWallet = (
    initialPath: RedirectPath,
    currentAccountId: string
  ): RedirectPath => {
    const { path, query } = initialPath
    const newPathSegments = path.split('/')

    newPathSegments[newPathSegments.length - 1] = currentAccountId

    return {
      path: newPathSegments.join('/'),
      query,
    }
  }

  const RedirectTypesActions: {
    [key in RedirectTypes]?: (
      chainParams: ChainParams,
      initialPath: RedirectPath
    ) => RedirectPath
  } = {
    [RedirectTypes.CHAIN_PREFIX_CHANGE]: (
      chainParams: ChainParams,
      initialPath: RedirectPath
    ) => getChangedChainPrefixFromPath(chainParams, initialPath),
    [RedirectTypes.WALLET_ADDRESS_CHANGE]: (
      chainParams: ChainParams,
      initialPath: RedirectPath
    ) => updatePathWithCurrentWallet(initialPath, accountId.value),
  }

  const checkIfPageHasSpecialRedirect = (pageType: PageType): boolean => {
    return SpecialRedirectPageTypes.includes(pageType as PageType)
  }

  const getRedirect = ({
    prevChain,
    newChain,
    pageType,
  }: {
    prevChain: Prefix
    newChain: Prefix
    pageType: PageType
  }): RedirectPath => {
    const pageRedirectTypes = PageRedirectType[PageType[pageType]]

    return pageRedirectTypes.reduce(
      (reducer: RedirectPath, pageRedirectType: RedirectTypes) => {
        const redirectAction = RedirectTypesActions[pageRedirectType]

        if (!redirectAction) {
          return reducer
        }

        return (
          redirectAction(
            {
              newChain,
              prevChain,
            },
            reducer
          ) ?? null
        )
      },
      {
        path: route.path,
        query: {},
      } as RedirectPath
    )
  }

  const getPageRedirectPath = (
    newChain: Prefix,
    prevChain: Prefix,
    defaultRedirectPath: string
  ): RedirectPath | null => {
    const routePath = route.path || ''

    const defaultRedirect: RedirectPath = {
      path: defaultRedirectPath,
    }

    const pageType = getPageType(routePath)

    const hasSpecialRedirect = checkIfPageHasSpecialRedirect(pageType)

    if (!hasSpecialRedirect) {
      return defaultRedirect
    }

    const pageTypeValue = PageType[pageType]
    const pageRedirectTypes: RedirectTypes[] = PageRedirectType[pageTypeValue]
    const isStayRedirect = pageRedirectTypes.includes(RedirectTypes.STAY)

    let isPageAvailableForChain = allowRedirectIfCheckNotPresent
    const pageAvailabilityCheck = pageAvailabilityPerChain[pageTypeValue]

    if (pageAvailabilityCheck) {
      isPageAvailableForChain = pageAvailabilityCheck(newChain)
    }

    if (isStayRedirect) {
      if (isPageAvailableForChain) {
        return null
      } else {
        return defaultRedirect
      }
    }

    if (isPageAvailableForChain) {
      return getRedirect({ newChain, prevChain, pageType })
    }

    return defaultRedirect
  }

  const redirectAfterChainChange = (
    newChain: Prefix,
    prevChain: Prefix,
    defaultRedirect = `/${newChain}`
  ) => {
    const redirectPath = getPageRedirectPath(
      newChain,
      prevChain,
      defaultRedirect
    )

    if (!redirectPath) {
      return
    }

    navigateTo(redirectPath)
  }

  return {
    redirectAfterChainChange,
  }
}
