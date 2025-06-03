"use client";

import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { InferType } from "yup";
import { FormProvider, useForm } from "react-hook-form";
import React, { useEffect, useState } from "react";
import FormSelectInput from "@/components/form/select/form-select";
import { useGetCompaniesService } from "@/services/api/services/companies";
import { useGetUsersService } from "@/services/api/services/users";
import {
  mockPostOpportunity,
  mockPutOpportunity,
} from "@/services/api/services/opportunities";
import { useSnackbar } from "@/hooks/use-snackbar";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { useRouter } from "next/navigation";
import { ClientFieldArray } from "./client-field-array";
import { PartnerFieldArray } from "./partener-field-array";
import { SubmitButtons } from "./submit-buttons";
import FormTextInput from "@/components/form/text-input/form-text-input";

export const validationSchema = yup.object({
  name: yup.string().required(),
  type: yup
    .string()
    .oneOf(["factoring", "reverse_factoring", "credit_insurance"])
    .required(),
  clients: yup
    .array()
    .of(
      yup.object({
        company: yup
          .object({
            id: yup.number().required(),
            name: yup.string().nullable(),
          })
          .required(),
        contacts: yup
          .array()
          .of(
            yup.object({
              id: yup.number().required(),
              name: yup.string().nullable(),
            })
          )
          .min(1)
          .required(),
      })
    )
    .min(1)
    .required(),
  partners: yup
    .array()
    .of(
      yup.object({
        type: yup.string().oneOf(["factor", "credit_insurer"]).required(),
        company: yup
          .object({
            id: yup.number().required(),
            name: yup.string().nullable(),
          })
          .required(),
        contacts: yup
          .array()
          .of(
            yup.object({
              id: yup.number().required(),
              name: yup.string().nullable(),
            })
          )
          .min(1)
          .required(),
      })
    )
    .min(1)
    .required(),
});

export type OpportunityFormData = InferType<typeof validationSchema>;

const emptyClient = {
  company: { id: 0, name: "" },
  contacts: [{ id: 0, name: "" }],
};

const emptyPartner = {
  type: undefined,
  company: { id: 0, name: "" },
  contacts: [{ id: 0, name: "" }],
} as unknown as OpportunityFormData["partners"][number];

type Props = {
  initialValues?: OpportunityFormData & { id?: number };
  onSuccess: () => void;
};

export default function OpportunityForm({ initialValues, onSuccess }: Props) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const fetchCompanies = useGetCompaniesService();
  const fetchUsers = useGetUsersService();
  const postOpportunity = mockPostOpportunity;
  const putOpportunity = mockPutOpportunity;

  const [companies, setCompanies] = useState<{ id: number; name: string }[]>(
    []
  );
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const loadCompanies = async () => {
      const { status, data } = await fetchCompanies({ page: 1, limit: 50 });
      if (status === HTTP_CODES_ENUM.OK) {
        setCompanies(data.data as { id: number; name: string }[]);
      }
    };
    loadCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    const loadUsers = async () => {
      const { status, data } = await fetchUsers({ page: 1, limit: 50 });
      if (status === HTTP_CODES_ENUM.OK) {
        setUsers(data.data as { id: number; name: string }[]);
      }
    };
    loadUsers();
  }, [fetchUsers]);

  const methods = useForm<OpportunityFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues:
      (initialValues as OpportunityFormData) ??
      ({
        type: undefined,
        clients: [emptyClient],
        partners: [emptyPartner],
      } as OpportunityFormData),
  });

  const { handleSubmit, setError } = methods;

  const onSubmit = handleSubmit(async (formData) => {
    const requestData = formData;
    const { data, status } = initialValues?.id
      ? await putOpportunity({ id: initialValues.id, data: requestData })
      : await postOpportunity(requestData);
    if (status === HTTP_CODES_ENUM.UNPROCESSABLE_ENTITY) {
      (Object.keys(data.errors) as Array<keyof OpportunityFormData>).forEach(
        (key) => {
          setError(key, { type: "manual", message: data.errors[key] });
        }
      );
      return;
    }
    if (status === HTTP_CODES_ENUM.CREATED || status === HTTP_CODES_ENUM.OK) {
      enqueueSnackbar("Saved", { variant: "success" });
      onSuccess();
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit}>
        <Grid container spacing={2} mb={3} mt={3}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6">Create an opportunity</Typography>
          </Grid>
          {/* Type field (full width) */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormTextInput<OpportunityFormData> name="name" label="Name" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormSelectInput<OpportunityFormData, { id: string; label: string }>
              name="type"
              label="Opportunity type"
              options={[
                { id: "factoring", label: "Factoring" },
                { id: "reverse_factoring", label: "Reverse Factoring" },
                { id: "credit_insurance", label: "Credit Insurance" },
              ]}
              keyValue="id"
              renderOption={(opt) => opt.label}
            />
          </Grid>

          {/* Clients Section */}
          <Grid size={12}>
            <Typography variant="h6">Clients</Typography>
            <ClientFieldArray
              companies={companies}
              users={users}
              emptyClient={emptyClient}
            />
          </Grid>

          {/* Partners Section */}
          <Grid size={12}>
            <Typography variant="h6">Partners</Typography>
          </Grid>
          <Grid size={12}>
            <PartnerFieldArray
              companies={companies}
              users={users}
              emptyPartner={emptyPartner}
            />
          </Grid>

          {/* Submit / Cancel Buttons */}
          <Grid size={12}>
            <SubmitButtons />
            <Button
              sx={{ ml: 1 }}
              variant="contained"
              color="inherit"
              onClick={() => router.push("/opportunities")}
            >
              Cancel
            </Button>
          </Grid>
        </Grid>
      </form>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: "50vw" } }}
      >
        {/* TODO: create company or user forms */}
      </Drawer>
    </FormProvider>
  );
}
