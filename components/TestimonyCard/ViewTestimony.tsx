import { useState, useEffect } from 'react';
import { NoResults } from "components/search/NoResults";
import { PaginationButtons } from "components/table";
import { useTranslation } from "next-i18next";
import { Card as BootstrapCard, Col, Row } from "react-bootstrap";
import styled from "styled-components";
import { Card as MapleCard } from "../Card";
import { useAuth } from "../auth";
import { Testimony, UsePublishedTestimonyListing } from "../db";
import { SortTestimonyDropDown } from "./SortTestimonyDropDown";
import { Tab, Tabs } from "./Tabs";
import { TestimonyItem } from "./TestimonyItem";

const Container = styled.div`
  font-family: Nunito;
`;

const Head = styled(BootstrapCard.Header)`
  background-color: var(--bs-blue);
  color: white;
  font-size: 22px;
`;

const ViewTestimony = (props: UsePublishedTestimonyListing & {
  search?: boolean,
  onProfilePage?: boolean,
  className?: string,
  isOrg?: boolean
}) => {
  const {
    items,
    setFilter,
    onProfilePage = false,
    className,
    pagination,
    isOrg
  } = props;

  const { user } = useAuth();
  const [totalTestimonies, setTotalTestimonies] = useState<number>(0);

  // Updated useEffect
  useEffect(() => {
    if (user?.uid) {
      fetch(`/api/users/${user.uid}/testimony/countTestimonies`)
        .then(response => response.json())
        .then(data => {
          if (data && data.count !== undefined) {
            setTotalTestimonies(data.count);
          }
        })
        .catch(error => {
          console.error("Failed to count user testimonies", error);
        });
    }
  }, [user?.uid]);

  const testimony = items.result ?? [];
  const [orderBy, setOrderBy] = useState<string>();
  const [activeTab, setActiveTab] = useState(1);

  const handleTabClick = (e: Event, value: number) => {
    setActiveTab(value);
  };

  const handleFilter = (filter: string | undefined) => {
    setFilter({ authorRole: filter });
  };

  const tabs = [
    <Tab
      key="at"
      label="All Testimonies"
      active={false}
      value={1}
      action={() => handleFilter("")}
    />,
    <Tab
      key="uo"
      label="Individuals"
      active={false}
      value={2}
      action={() => handleFilter("user")}
    />,
    <Tab
      key="oo"
      label="Organizations"
      active={false}
      value={3}
      action={() => handleFilter("organization")}
    />
  ];

  const { t } = useTranslation("testimony");

  return (
    <Container>
      <MapleCard
        className={className}
        headerElement={<Head>{isOrg ? t("Our Testimonies") : t("Testimonies")}</Head>}
        body={
          <BootstrapCard.Body>
            {!onProfilePage && (
              <Row>
                <Tabs
                  childTabs={tabs}
                  onChange={handleTabClick}
                  selectedTab={activeTab}
                />
              </Row>
            )}

            {testimony.length > 0 ? (
              <div>
                {onProfilePage && (
                  <Row className="justify-content-between mb-4">
                    <ShowPaginationSummary
                      totalItems={totalTestimonies}
                      pagination={pagination}
                      t={t}
                    />

                    <Col xs="auto">
                      <SortTestimonyDropDown
                        orderBy={orderBy}
                        setOrderBy={setOrderBy}
                      />
                    </Col>
                  </Row>
                )}

                {testimony
                  .sort((a, b) =>
                    orderBy === "Oldest First"
                      ? a.publishedAt > b.publishedAt
                        ? 1
                        : -1
                      : a.publishedAt < b.publishedAt
                      ? 1
                      : -1
                  )
                  .map(t => (
                    <TestimonyItem
                      key={t.authorUid + t.billId}
                      testimony={t}
                      isUser={t.authorUid === user?.uid}
                      onProfilePage={onProfilePage}
                    />
                  ))}

                {(pagination.hasPreviousPage || pagination.hasNextPage) && (
                  <PaginationButtons pagination={pagination} />
                )}
              </div>
            ) : (
              <NoResults>
                {t("viewTestimony.noTestimonies")}
                <br />
              </NoResults>
            )}
          </BootstrapCard.Body>
        }
      />
    </Container>
  );
};

export default ViewTestimony;

function ShowPaginationSummary({
  totalItems,
  pagination,
  t
}: {
  totalItems: number;
  pagination: { currentPage: number; itemsPerPage: number };
  t: TFunction;
}) {
  if (totalItems < 1) {
    return <div>{t("viewTestimony.noTestimonies")}</div>;
  }
  
  const { currentPage, itemsPerPage } = pagination;
  const currentPageStart = (currentPage - 1) * itemsPerPage;
  let currentPageEnd = currentPageStart + itemsPerPage;
  if (currentPageEnd > totalItems) {
    currentPageEnd = totalItems;
  }

  return (
    <div>
      {t("viewTestimony.showing")} {currentPageStart + 1}–{currentPageEnd} {t("viewTestimony.outOf")} {totalItems}
    </div>
  );
}
